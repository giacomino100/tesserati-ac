import { labelFor } from '@tesseramento/fees';
import { listLabel, type AdhesionList, type ImportError, type SkippedRow } from '@tesseramento/import';

/** Testi della schermata di import (contratti delle specifiche 004 e 005). Nessun dato personale. */
export const IMPORT_MESSAGES = {
  unreadable: 'Il file non è un Excel valido.',
  sheetNotFound: 'Nel file manca il foglio ElencoAdesioniExcel.',
  noRows: 'Il file non contiene righe da importare.',
  invalidYear:
    'Non riesco a leggere l\'anno associativo: la colonna Anno Associativo deve contenere "Anno 2026" uguale in tutte le righe.',
  unknownList:
    'Non riesco a capire di quale elenco si tratta: la colonna Settore deve contenere RAGAZZI, GIOVANI o ADULTI.',
  allRowsSkipped: 'Nessuna riga valida da importare.',
  saveFailed: 'Impossibile salvare. Controlla la connessione e riprova. Non è stato salvato nulla.',
  yearCheckFailed: "Impossibile verificare l'anno associativo. Controlla la connessione e riprova.",
  contextChanged: 'Nel frattempo sono stati importati altri tesserati di questo anno. Ricarica il file e riprova.',
} as const;

export function missingColumnsMessage(columns: readonly string[]): string {
  return `Nel file mancano le colonne: ${columns.join(', ')}.`;
}

export function noFeeScheduleMessage(year: number): string {
  return `Manca il listino ${labelFor(year)}. Crealo prima nella sezione Listini.`;
}

export function alreadyImportedMessage(year: number, list: AdhesionList): string {
  return `L'elenco ${listLabel(list)} del ${labelFor(year)} è già stato importato.`;
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
    case 'unknownList':
      return IMPORT_MESSAGES.unknownList;
    case 'allRowsSkipped':
      return IMPORT_MESSAGES.allRowsSkipped;
  }
}

/** "Riga 7: manca la data di nascita" — numero di riga e motivo, mai i dati della riga. */
export function skippedMessage(row: SkippedRow, year?: number): string {
  const reason = {
    missingLastName: 'manca il cognome',
    missingFirstName: 'manca il nome',
    missingBirthDate: 'manca la data di nascita',
    invalidBirthDate: 'data di nascita non valida',
    duplicate: `stessa persona della riga ${row.duplicateOf ?? '?'}`,
    alreadyInYear: `già importata nell'elenco ${row.fromList ? listLabel(row.fromList) : '?'}${
      year === undefined ? '' : ` del ${labelFor(year)}`
    }`,
  }[row.reason];
  return `Riga ${row.rowNumber}: ${reason}`;
}
