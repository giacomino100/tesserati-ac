import { labelFor } from '@tesseramento/fees';
import {
  ADHESION_LISTS,
  listLabel,
  sectorOf,
  type AdhesionList,
  type AgeWarning,
  type ArchivedPerson,
  type ImportError,
  type ImportRow,
  type SkippedRow,
  type TaxCodeMatch,
} from '@tesseramento/import';
import { italianDate } from './format';

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
  decideDuplicates: 'Decidi i possibili doppioni prima di importare.',
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
    alreadyRenewed: "già presente nell'anno (riconferma)",
  }[row.reason];
  const name = [row.lastName, row.firstName].filter(Boolean).join(' ');
  return name ? `Riga ${row.rowNumber} (${name}): ${reason}` : `Riga ${row.rowNumber}: ${reason}`;
}

/* ---- Specifica 006: doppioni, codice fiscale, avvisi (solo a schermo, mai nei log) ---- */

/** "Riga 7: ROSSI MARIA GRAZIA, 12/03/1965". */
export function duplicateRowLabel(row: ImportRow): string {
  return `Riga ${row.rowNumber}: ${row.lastName} ${row.firstName}, ${italianDate(row.birthDate)}`;
}

/** "ROSSI MARIA, 12/03/1965 · ACR 2025/26", con "(già importata quest'anno)" se l'adesione è dell'anno in import. */
export function candidateLabel(person: ArchivedPerson, year: number): string {
  const base = `${person.lastName} ${person.firstName}, ${italianDate(person.birthDate)}`;
  const last = person.lastAdhesion;
  if (!last) return base;
  const already = last.year === year ? " (già importata quest'anno)" : '';
  return `${base} · ${listLabel(last.list)} ${labelFor(last.year)}${already}`;
}

/** "Riga 9: NERI ANA → NERI ANNA, 05/11/1982 (stesso codice fiscale)". */
export function taxCodeNote(match: TaxCodeMatch): string {
  const { row, person } = match;
  return `Riga ${row.rowNumber}: ${row.lastName} ${row.firstName} → ${person.lastName} ${person.firstName}, ${italianDate(person.birthDate)} (stesso codice fiscale)`;
}

function groupLabel(sector: string): string {
  const list = ADHESION_LISTS.find((l) => sectorOf(l) === sector);
  return list ? listLabel(list) : sector;
}

/** Avviso su età e settore (FR-008). */
export function warningMessage(warning: AgeWarning, minAge: number): string {
  const { row, age } = warning;
  const prefix = `Riga ${row.rowNumber} (${row.lastName} ${row.firstName})`;
  if (warning.kind === 'belowMinimumAge') return `${prefix}: ${age} anni, sotto l'età minima di ${minAge} anni del listino`;
  return `${prefix}: ${age} anni: per il listino è ${groupLabel(warning.expectedSector ?? '')}, nell'export è ${row.sector}`;
}
