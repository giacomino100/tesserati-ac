import { Injectable, computed, inject, signal } from '@angular/core';
import { labelFor } from '@tesseramento/fees';
import {
  listLabel,
  parseAdhesionSheet,
  planImport,
  type AdhesionList,
  type ImportPlan,
  type ImportRow,
  type ParsedImportOk,
  type SkippedRow,
} from '@tesseramento/import';
import { AuthService } from '../core/auth.service';
import {
  AlreadyImportedError,
  IMPORT_BACKEND,
  ImportContextChangedError,
  NoFeeScheduleError,
  type YearContext,
} from './import-backend';
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
  readonly listLabel: string;
  readonly adhesions: number;
  readonly newPersons: number;
  readonly reusedPersons: number;
}

/** File letto e contesto dell'anno: l'elenco può mancare solo in parità, finché l'utente non sceglie. */
export interface PreviewData {
  readonly parsed: ParsedImportOk;
  readonly context: YearContext;
  readonly list?: AdhesionList;
  /** Piano definitivo (persone nuove, riusate, righe saltate) per l'elenco scelto. */
  readonly plan?: ImportPlan;
  /** L'elenco scelto in parità è già stato importato per l'anno. */
  readonly listMessage?: string;
}

export type ImportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading' }
  | {
      readonly kind: 'rejected';
      readonly message: string;
      readonly skipped: readonly SkippedRow[];
      readonly year?: number;
      /** Manca il listino dell'anno: la pagina mostra il collegamento ai Listini. */
      readonly showListiniLink: boolean;
    }
  | ({ readonly kind: 'preview' } & PreviewData)
  | ({ readonly kind: 'saving' } & PreviewData)
  | ({ readonly kind: 'saveFailed'; readonly message: string } & PreviewData)
  | { readonly kind: 'done'; readonly parsed: ParsedImportOk; readonly summary: ImportSummary; readonly plan: ImportPlan };

/**
 * Import degli elenchi ACR, Giovani e Adulti (specifiche 004 e 005): lettura del file, anteprima,
 * salvataggio. Il file resta in memoria nel browser; nessun dato delle righe viene scritto nei log.
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

  private readonly plan = computed(() => {
    const state = this.state();
    return 'plan' in state ? state.plan : undefined;
  });

  readonly isSaving = computed(() => this.state().kind === 'saving');

  readonly yearLabel = computed(() => {
    const parsed = this.parsed();
    return parsed ? labelFor(parsed.associationYear) : '';
  });

  /** Elenco scelto o riconosciuto ("Giovani"); vuoto finché in parità non si sceglie. */
  readonly listLabel = computed(() => {
    const state = this.state();
    return 'list' in state && state.list ? listLabel(state.list) : '';
  });

  readonly selectedList = computed(() => {
    const state = this.state();
    return 'list' in state ? state.list : undefined;
  });

  /** Elenchi tra cui scegliere quando il settore più frequente è in parità (chiarimento della 005). */
  readonly tieCandidates = computed<readonly AdhesionList[]>(() => {
    const recognition = this.parsed()?.recognition;
    return recognition?.kind === 'tie' ? recognition.candidates : [];
  });

  readonly listMessage = computed(() => {
    const state = this.state();
    return 'listMessage' in state ? (state.listMessage ?? '') : '';
  });

  readonly canConfirm = computed(() => {
    const state = this.state();
    return (state.kind === 'preview' || state.kind === 'saveFailed') && !!state.plan && !state.listMessage;
  });

  readonly totals = computed(() => {
    const parsed = this.parsed();
    return {
      inFile: parsed?.totalRows ?? 0,
      toImport: this.plan()?.adhesions ?? parsed?.rows.length ?? 0,
    };
  });

  /** Prime righe che verranno importate (senza quelle già presenti nell'anno). */
  readonly firstRows = computed<readonly ImportRow[]>(() => {
    const parsed = this.parsed();
    if (!parsed) return [];
    const skipped = new Set(this.plan()?.skipped.map((s) => s.rowNumber));
    return parsed.rows.filter((r) => !skipped.has(r.rowNumber)).slice(0, PREVIEW_ROWS);
  });

  readonly skippedMessages = computed(() => {
    const state = this.state();
    const year = this.parsed()?.associationYear ?? (state.kind === 'rejected' ? state.year : undefined);
    const skipped =
      this.plan()?.skipped ?? this.parsed()?.skipped ?? (state.kind === 'rejected' ? state.skipped : []);
    return skipped.map((row) => skippedMessage(row, year));
  });

  readonly showListiniLink = computed(() => {
    const state = this.state();
    return state.kind === 'rejected' && state.showListiniLink;
  });

  readonly summary = computed(() => {
    const state = this.state();
    return state.kind === 'done' ? state.summary : undefined;
  });

  /** Legge il file scelto, carica il contesto dell'anno e mostra l'anteprima o il motivo del rifiuto. */
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
    let context;
    try {
      context = await this.backend.yearContext(parsed.associationYear);
    } catch {
      this.reject(IMPORT_MESSAGES.yearCheckFailed);
      return;
    }
    if (!context.hasFeeSchedule) {
      this.reject(noFeeScheduleMessage(parsed.associationYear), [], true);
      return;
    }
    const recognized = parsed.recognition.kind === 'recognized' ? parsed.recognition.list : undefined;
    this.showPreview(parsed, context, recognized);
  }

  /** Scelta dell'elenco in caso di parità. */
  choose(list: AdhesionList): void {
    const state = this.state();
    if (state.kind !== 'preview' || !this.tieCandidates().includes(list)) return;
    this.showPreview(state.parsed, state.context, list);
  }

  /** Salva persone nuove e adesioni dell'anno in un colpo solo (FR-009 e FR-014 della 004). */
  async confirm(): Promise<void> {
    const state = this.state();
    if ((state.kind !== 'preview' && state.kind !== 'saveFailed') || !this.canConfirm()) return;
    const { parsed, context, list, plan } = state;
    if (!plan || !list) return;
    this.state.set({ kind: 'saving', parsed, context, list, plan });
    try {
      const email = this.auth.user()?.email;
      if (!email) throw new Error('no-user');
      await this.backend.commit(plan, email);
      this.state.set({
        kind: 'done',
        parsed,
        plan,
        summary: {
          year: plan.associationYear,
          yearLabel: labelFor(plan.associationYear),
          listLabel: listLabel(plan.list),
          adhesions: plan.adhesions,
          newPersons: plan.newPersons.length,
          reusedPersons: plan.reusedPersons.length,
        },
      });
    } catch (error) {
      // Controlli ripetuti nella transazione: qualcun altro può aver importato o tolto il listino.
      const year = plan.associationYear;
      if (error instanceof AlreadyImportedError) this.reject(alreadyImportedMessage(year, error.list));
      else if (error instanceof NoFeeScheduleError) this.reject(noFeeScheduleMessage(year), [], true);
      else if (error instanceof ImportContextChangedError) this.reject(IMPORT_MESSAGES.contextChanged);
      else this.state.set({ kind: 'saveFailed', parsed, context, list, plan, message: IMPORT_MESSAGES.saveFailed });
    }
  }

  /** Torna alla scelta del file e dimentica le righe lette (FR-004 della 004). */
  cancel(): void {
    if (this.isSaving()) return;
    this.state.set({ kind: 'idle' });
  }

  /** Anteprima per un elenco (o in attesa della scelta in parità). */
  private showPreview(parsed: ParsedImportOk, context: YearContext, list: AdhesionList | undefined): void {
    const year = parsed.associationYear;
    if (!list) {
      this.state.set({ kind: 'preview', parsed, context });
      return;
    }
    if (context.importedLists.includes(list)) {
      const message = alreadyImportedMessage(year, list);
      // Elenco riconosciuto: rifiuto. Elenco scelto in parità: messaggio, l'utente può sceglierne un altro.
      if (parsed.recognition.kind === 'recognized') this.reject(message);
      else this.state.set({ kind: 'preview', parsed, context, list, listMessage: message });
      return;
    }
    const plan = planImport(parsed, list, context.persons, context.adhesions);
    if (plan.adhesions === 0) {
      this.reject(IMPORT_MESSAGES.allRowsSkipped, plan.skipped, false, year);
      return;
    }
    this.state.set({ kind: 'preview', parsed, context, list, plan });
  }

  private reject(message: string, skipped: readonly SkippedRow[] = [], showListiniLink = false, year?: number): void {
    this.state.set({ kind: 'rejected', message, skipped, showListiniLink, ...(year === undefined ? {} : { year }) });
  }
}
