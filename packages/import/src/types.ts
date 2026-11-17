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

export type SkipReason = 'missingLastName' | 'missingFirstName' | 'missingBirthDate' | 'invalidBirthDate' | 'duplicate';

export interface SkippedRow {
  readonly rowNumber: number;
  readonly reason: SkipReason;
  /** Per `duplicate`: la riga che è stata tenuta. */
  readonly duplicateOf?: number;
}

export type ImportError =
  | { readonly kind: 'sheetNotFound' }
  | { readonly kind: 'missingColumns'; readonly columns: readonly string[] }
  | { readonly kind: 'noRows' }
  | { readonly kind: 'invalidYear' }
  | { readonly kind: 'mixedYears' }
  | { readonly kind: 'notAcr' }
  | { readonly kind: 'allRowsSkipped'; readonly skipped: readonly SkippedRow[] };

export interface ParsedImportOk {
  readonly ok: true;
  readonly associationYear: number;
  readonly rows: readonly ImportRow[];
  readonly skipped: readonly SkippedRow[];
  /** Righe di dati nel file (escluse le intestazioni e le righe del tutto vuote). */
  readonly totalRows: number;
}

export interface ParsedImportError {
  readonly ok: false;
  readonly error: ImportError;
}

export type ParsedImport = ParsedImportOk | ParsedImportError;

export interface ImportPlan {
  readonly associationYear: number;
  /** ID del segno di import, es. "2026-ACR". */
  readonly importId: string;
  readonly newPersons: readonly ImportRow[];
  readonly reusedPersons: readonly { readonly row: ImportRow; readonly personId: string }[];
  readonly adhesions: number;
  readonly skipped: readonly SkippedRow[];
}

/** Contenuto di un foglio Excel già estratto (prima riga = intestazioni). */
export interface SheetInput {
  readonly sheetNames: readonly string[];
  readonly rows: readonly (readonly unknown[])[];
  readonly date1904: boolean;
}
