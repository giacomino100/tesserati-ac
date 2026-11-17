import { Injectable, computed, inject, signal } from '@angular/core';
import { labelFor } from '@tesseramento/fees';
import {
  parseAdhesionSheet,
  planImport,
  type ImportRow,
  type ParsedImportOk,
  type SkippedRow,
} from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import { AlreadyImportedError, IMPORT_BACKEND, NoFeeScheduleError } from './import-backend';
import {
  alreadyImportedMessage,
  fileErrorMessage,
  IMPORT_MESSAGES,
  noFeeScheduleMessage,
  skippedMessage,
} from './messages';
import { WORKBOOK_READER } from './workbook-reader';

const PREVIEW_ROWS = 10;

export interface ImportSummary {
  readonly year: number;
  readonly yearLabel: string;
  readonly adhesions: number;
  readonly newPersons: number;
  readonly reusedPersons: number;
}

export type ImportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading' }
  | {
      readonly kind: 'rejected';
      readonly message: string;
      readonly skipped: readonly SkippedRow[];
      /** Manca il listino dell'anno: la pagina mostra il collegamento ai Listini. */
      readonly showListiniLink: boolean;
    }
  | { readonly kind: 'preview'; readonly parsed: ParsedImportOk }
  | { readonly kind: 'saving'; readonly parsed: ParsedImportOk }
  | { readonly kind: 'saveFailed'; readonly parsed: ParsedImportOk; readonly message: string }
  | { readonly kind: 'done'; readonly parsed: ParsedImportOk; readonly summary: ImportSummary };

/**
 * Import dell'elenco ACR (specifica 004): lettura del file, anteprima, salvataggio.
 * Il file resta in memoria nel browser; nessun dato delle righe viene scritto nei log.
 * L'autorizzazione vera sta nelle Security Rules.
 */
@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly reader = inject(WORKBOOK_READER);
  private readonly backend = inject(IMPORT_BACKEND);
  private readonly auth = inject(AuthService);

  readonly state = signal<ImportState>({ kind: 'idle' });

  private readonly parsed = computed(() => {
    const state = this.state();
    return 'parsed' in state ? state.parsed : undefined;
  });

  readonly isSaving = computed(() => this.state().kind === 'saving');

  readonly yearLabel = computed(() => {
    const parsed = this.parsed();
    return parsed ? labelFor(parsed.associationYear) : '';
  });

  readonly totals = computed(() => {
    const parsed = this.parsed();
    return { inFile: parsed?.totalRows ?? 0, toImport: parsed?.rows.length ?? 0 };
  });

  readonly firstRows = computed<readonly ImportRow[]>(() => this.parsed()?.rows.slice(0, PREVIEW_ROWS) ?? []);

  readonly skippedMessages = computed(() => {
    const state = this.state();
    const skipped = 'parsed' in state ? state.parsed.skipped : state.kind === 'rejected' ? state.skipped : [];
    return skipped.map(skippedMessage);
  });

  readonly showListiniLink = computed(() => {
    const state = this.state();
    return state.kind === 'rejected' && state.showListiniLink;
  });

  readonly summary = computed(() => {
    const state = this.state();
    return state.kind === 'done' ? state.summary : undefined;
  });

  /** Legge il file scelto e mostra l'anteprima o il motivo del rifiuto. */
  async chooseFile(file: File): Promise<void> {
    this.state.set({ kind: 'reading' });
    let parsed;
    try {
      parsed = parseAdhesionSheet(await this.reader.read(file));
    } catch {
      // UnreadableFileError o qualsiasi errore di lettura: il file non è un Excel utilizzabile.
      this.reject(IMPORT_MESSAGES.unreadable);
      return;
    }
    if (!parsed.ok) {
      this.reject(fileErrorMessage(parsed.error), parsed.error.kind === 'allRowsSkipped' ? parsed.error.skipped : []);
      return;
    }
    let status;
    try {
      status = await this.backend.yearStatus(parsed.associationYear);
    } catch {
      this.reject(IMPORT_MESSAGES.yearCheckFailed);
      return;
    }
    if (!status.hasFeeSchedule) {
      this.reject(noFeeScheduleMessage(parsed.associationYear), [], true);
      return;
    }
    if (status.alreadyImported) {
      this.reject(alreadyImportedMessage(parsed.associationYear));
      return;
    }
    this.state.set({ kind: 'preview', parsed });
  }

  /** Salva persone nuove e adesioni dell'anno in un colpo solo (FR-009, FR-014). */
  async confirm(): Promise<void> {
    const state = this.state();
    if (state.kind !== 'preview' && state.kind !== 'saveFailed') return;
    const { parsed } = state;
    this.state.set({ kind: 'saving', parsed });
    try {
      const email = this.auth.user()?.email;
      if (!email) throw new Error('no-user');
      const plan = planImport(parsed, await this.backend.existingPersons());
      await this.backend.commit(plan, email);
      this.state.set({
        kind: 'done',
        parsed,
        summary: {
          year: plan.associationYear,
          yearLabel: labelFor(plan.associationYear),
          adhesions: plan.adhesions,
          newPersons: plan.newPersons.length,
          reusedPersons: plan.reusedPersons.length,
        },
      });
    } catch (error) {
      // Controlli ripetuti nella transazione: qualcun altro può aver importato l'anno o tolto il listino.
      if (error instanceof AlreadyImportedError) this.reject(alreadyImportedMessage(parsed.associationYear));
      else if (error instanceof NoFeeScheduleError) this.reject(noFeeScheduleMessage(parsed.associationYear), [], true);
      else this.state.set({ kind: 'saveFailed', parsed, message: IMPORT_MESSAGES.saveFailed });
    }
  }

  /** Torna alla scelta del file e dimentica le righe lette (FR-004). */
  cancel(): void {
    if (this.isSaving()) return;
    this.state.set({ kind: 'idle' });
  }

  private reject(message: string, skipped: readonly SkippedRow[] = [], showListiniLink = false): void {
    this.state.set({ kind: 'rejected', message, skipped, showListiniLink });
  }
}
