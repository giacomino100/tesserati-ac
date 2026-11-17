import type { AdhesionList, ListRecognition } from './lists';

/** Riga valida dell'elenco adesioni: solo le colonne necessarie (constitution III, data-model.md). */
export interface ImportRow {
  /** Numero di riga in Excel (intestazioni = 1). */
  readonly rowNumber: number;
  readonly lastName: string;
  readonly firstName: string;
  readonly sex?: 'M' | 'F';
  /** Giorno di calendario "AAAA-MM-GG", senza fuso orario. */
  readonly birthDate: string;
  /** Solo se di 16 caratteri alfanumerici; altrimenti assente. */
  readonly taxCode?: string;
  readonly sector: string;
  /** Fascia d'età dell'export (es. "6/8"), non quella delle quote. */
  readonly exportAgeBand?: string;
  /** Legame (es. "C3"). */
  readonly bond?: string;
  /** N. Legame come testo senza decimali. */
  readonly bondId?: string;
  /** COGNOME|NOME|AAAA-MM-GG normalizzati. */
  readonly identityKey: string;
}

export type SkipReason =
  | 'missingLastName'
  | 'missingFirstName'
  | 'missingBirthDate'
  | 'invalidBirthDate'
  | 'duplicate'
  /** La persona ha già un'adesione nello stesso anno da un altro elenco (specifica 005). */
  | 'alreadyInYear'
  /** La persona è già stata riconfermata nell'anno (specifica 008). */
  | 'alreadyRenewed'
  /** La persona è stata inserita a mano nell'anno (specifica 009). */
  | 'alreadyAdded';

export interface SkippedRow {
  readonly rowNumber: number;
  readonly reason: SkipReason;
  /** Per `duplicate`: la riga che è stata tenuta. */
  readonly duplicateOf?: number;
  /** Per `alreadyInYear`: l'elenco dell'adesione già presente. */
  readonly fromList?: AdhesionList;
  /** Cognome e nome puliti, se presenti nella riga: solo per mostrarli a schermo, mai salvati (006). */
  readonly lastName?: string;
  readonly firstName?: string;
}

export type ImportError =
  | { readonly kind: 'sheetNotFound' }
  | { readonly kind: 'missingColumns'; readonly columns: readonly string[] }
  | { readonly kind: 'noRows' }
  | { readonly kind: 'invalidYear' }
  | { readonly kind: 'mixedYears' }
  | { readonly kind: 'unknownList' }
  | { readonly kind: 'allRowsSkipped'; readonly skipped: readonly SkippedRow[] };

export interface ParsedImportOk {
  readonly ok: true;
  readonly associationYear: number;
  readonly rows: readonly ImportRow[];
  readonly skipped: readonly SkippedRow[];
  /** Righe di dati nel file (escluse le intestazioni e le righe del tutto vuote). */
  readonly totalRows: number;
  /** Elenco riconosciuto dal settore più frequente, o parità da far scegliere all'utente. */
  readonly recognition: ListRecognition;
}

export interface ParsedImportError {
  readonly ok: false;
  readonly error: ImportError;
}

export type ParsedImport = ParsedImportOk | ParsedImportError;

/** Persona già in archivio, come serve all'anteprima (specifica 006). */
export interface ArchivedPerson {
  readonly id: string;
  readonly lastName: string;
  readonly firstName: string;
  /** "AAAA-MM-GG". */
  readonly birthDate: string;
  readonly identityKey: string;
  readonly taxCode?: string;
  /** Ultima adesione (anno più recente) e il suo elenco. */
  readonly lastAdhesion?: { readonly year: number; readonly list: AdhesionList };
}

/** Scelta dell'utente su un possibile doppione: ID della persona (stessa persona) o persona nuova. */
export type DuplicateDecision = string | 'new';

/** Riga simile a una o più persone in archivio, da decidere a mano (regole-famiglia.md §2). */
export interface PossibleDuplicate {
  readonly row: ImportRow;
  readonly candidates: readonly ArchivedPerson[];
  readonly decision?: DuplicateDecision;
}

/** Riga attribuita a una persona in archivio dal codice fiscale. */
export interface TaxCodeMatch {
  readonly row: ImportRow;
  readonly person: ArchivedPerson;
  /** Vero se anche cognome, nome e data corrispondono: falso = da segnalare. */
  readonly sameKey: boolean;
}

/** Avviso non bloccante su età e settore (specifica 006, FR-008). */
export interface AgeWarning {
  readonly row: ImportRow;
  readonly age: number;
  readonly kind: 'belowMinimumAge' | 'sectorMismatch';
  /** Per `sectorMismatch`: il settore dell'export atteso secondo il listino. */
  readonly expectedSector?: string;
}

export interface ImportPlan {
  readonly associationYear: number;
  readonly list: AdhesionList;
  /** ID del segno di import, es. "2026-GIOVANI". */
  readonly importId: string;
  readonly newPersons: readonly ImportRow[];
  readonly reusedPersons: readonly { readonly row: ImportRow; readonly personId: string }[];
  readonly adhesions: number;
  readonly skipped: readonly SkippedRow[];
  /** Possibili doppioni, con la scelta se c'è. */
  readonly duplicates: readonly PossibleDuplicate[];
  /** Doppioni ancora senza scelta: finché sono più di 0 non si importa. */
  readonly pendingDuplicates: number;
  readonly taxCodeMatches: readonly TaxCodeMatch[];
  /** Doppioni decisi "Stessa persona". */
  readonly confirmedSame: number;
}

/** Contenuto di un foglio Excel già estratto (prima riga = intestazioni). */
export interface SheetInput {
  readonly sheetNames: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
  readonly date1904: boolean;
}

/* ---- Specifica 009: nuovo tesserato inserito a mano ---- */

/** Testi del modulo "Nuovo tesserato" (data dal campo data del browser: "AAAA-MM-GG" o ""). */
export interface NewMemberInput {
  readonly lastName: string;
  readonly firstName: string;
  readonly birthDate: string;
  readonly sex: string;
  readonly taxCode: string;
}

/** Persona del modulo, pulita come nell'import. */
export interface NewMember {
  readonly lastName: string;
  readonly firstName: string;
  readonly birthDate: string;
  readonly identityKey: string;
  readonly sex?: 'M' | 'F';
  readonly taxCode?: string;
}

export interface NewMemberErrors {
  readonly lastName?: string;
  readonly firstName?: string;
  readonly birthDate?: string;
  readonly taxCode?: string;
}

/** Esito della ricerca in archivio (research R4). */
export type NewMemberMatch =
  | { readonly kind: 'new' }
  | { readonly kind: 'existing'; readonly person: ArchivedPerson; readonly by: 'identity' | 'taxCode' }
  | { readonly kind: 'similar'; readonly candidates: readonly ArchivedPerson[] }
  | { readonly kind: 'renewable'; readonly person: ArchivedPerson; readonly previousYear: number }
  | { readonly kind: 'alreadyInYear'; readonly person: ArchivedPerson };
