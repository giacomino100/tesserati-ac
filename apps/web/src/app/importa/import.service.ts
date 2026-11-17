import { Injectable, computed, inject, signal } from '@angular/core';
import { labelFor } from '@tesseramento/fees';
import { parseAdhesionSheet, type ImportRow, type ParsedImportOk, type SkippedRow } from '@tesseramento/import';
import { fileErrorMessage, IMPORT_MESSAGES, skippedMessage } from './messages';
import { WORKBOOK_READER } from './workbook-reader';

const PREVIEW_ROWS = 10;

export type ImportState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading' }
  | { readonly kind: 'rejected'; readonly message: string; readonly skipped: readonly SkippedRow[] }
  | { readonly kind: 'preview'; readonly parsed: ParsedImportOk };

/**
 * Import dell'elenco ACR (specifica 004): lettura del file, anteprima, salvataggio.
 * Il file resta in memoria nel browser; nessun dato delle righe viene scritto nei log.
 */
@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly reader = inject(WORKBOOK_READER);

  readonly state = signal<ImportState>({ kind: 'idle' });

  private readonly parsed = computed(() => {
    const state = this.state();
    return 'parsed' in state ? state.parsed : undefined;
  });

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
    this.state.set({ kind: 'preview', parsed });
  }

  /** Torna alla scelta del file e dimentica le righe lette (FR-004). */
  cancel(): void {
    this.state.set({ kind: 'idle' });
  }

  private reject(message: string, skipped: readonly SkippedRow[] = []): void {
    this.state.set({ kind: 'rejected', message, skipped });
  }
}
