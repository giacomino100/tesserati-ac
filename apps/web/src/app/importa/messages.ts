import { labelFor } from '@tesseramento/fees';
import type { ImportError, RequiredColumn, SkippedRow } from '@tesseramento/import';

/** Testi della schermata di import (contracts/app-routes.md). Nessun dato personale. */
export const IMPORT_MESSAGES = {
  unreadable: 'Il file non è un Excel valido.',
  sheetNotFound: 'Nel file manca il foglio ElencoAdesioniExcel.',
  noRows: 'Il file non contiene righe da importare.',
  invalidYear:
    'Non riesco a leggere l\'anno associativo: la colonna Anno Associativo deve contenere "Anno 2026" uguale in tutte le righe.',
  notAcr: 'Il file non sembra l\'elenco ACR: nessuna riga ha il settore RAGAZZI.',
  allRowsSkipped: 'Nessuna riga valida da importare.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
} as const;

export function missingColumnsMessage(columns: readonly RequiredColumn[] | readonly string[]): string {
  return `Nel file mancano le colonne: ${columns.join(', ')}.`;
}

export function noFeeScheduleMessage(year: number): string {
  return `Manca il listino ${labelFor(year)}. Crealo prima nella sezione Listini.`;
}

export function alreadyImportedMessage(year: number): string {
  return `L'elenco ACR del ${labelFor(year)} è già stato importato.`;
}

/** Messaggio per un errore che riguarda tutto il file. */
export function fileErrorMessage(error: ImportError): string {
  switch (error.kind) {
    case 'sheetNotFound':
      return IMPORT_MESSAGES.sheetNotFound;
    case 'missingColumns':
      return missingColumnsMessage(error.columns);
    case 'noRows':
      return IMPORT_MESSAGES.noRows;
    case 'invalidYear':
    case 'mixedYears':
      return IMPORT_MESSAGES.invalidYear;
    case 'notAcr':
      return IMPORT_MESSAGES.notAcr;
    case 'allRowsSkipped':
      return IMPORT_MESSAGES.allRowsSkipped;
  }
}

/** "Riga 7: manca la data di nascita" — numero di riga e motivo, mai i dati della riga. */
export function skippedMessage(row: SkippedRow): string {
  const reason = {
    missingLastName: 'manca il cognome',
    missingFirstName: 'manca il nome',
    missingBirthDate: 'manca la data di nascita',
    invalidBirthDate: 'data di nascita non valida',
    duplicate: `stessa persona della riga ${row.duplicateOf ?? '?'}`,
  }[row.reason];
  return `Riga ${row.rowNumber}: ${reason}`;
}
