import { cleanText, parseAssociationYear } from './clean';
import { EXPECTED_SHEET, locateColumns, type ColumnIndex, type RequiredColumn } from './columns';
import { toIsoDate } from './date';
import { identityKey } from './identity';
import type { ImportRow, ParsedImport, SheetInput, SkippedRow } from './types';

const TAX_CODE = /^[A-Z0-9]{16}$/;

function isBlankRow(row: readonly unknown[]): boolean {
  return row.every((cell) => cleanText(cell) === undefined);
}

/** Riga del foglio → riga valida o motivo per saltarla. Legge solo le colonne necessarie. */
function toImportRow(
  cells: readonly unknown[],
  rowNumber: number,
  index: ColumnIndex,
  date1904: boolean,
): ImportRow | SkippedRow {
  const cell = (column: RequiredColumn): unknown => cells[index[column]];
  const text = (column: RequiredColumn): string | undefined => cleanText(cell(column));

  const lastName = text('Cognome');
  if (!lastName) return { rowNumber, reason: 'missingLastName' };
  const firstName = text('Nome');
  if (!firstName) return { rowNumber, reason: 'missingFirstName' };
  const rawDate = cell('Data Nascita');
  if (cleanText(rawDate) === undefined) return { rowNumber, reason: 'missingBirthDate' };
  const birthDate = toIsoDate(typeof rawDate === 'string' ? rawDate.trim() : rawDate, date1904);
  if (!birthDate) return { rowNumber, reason: 'invalidBirthDate' };

  const sex = text('Sesso')?.toUpperCase();
  const taxCode = text('Cod. Fiscale')?.toUpperCase();
  const exportAgeBand = text("Fasce d'età");
  const bond = text('Legame');
  const bondId = text('N. Legame');

  return {
    rowNumber,
    lastName,
    firstName,
    ...(sex === 'M' || sex === 'F' ? { sex } : {}),
    birthDate,
    ...(taxCode && TAX_CODE.test(taxCode) ? { taxCode } : {}),
    sector: text('Settore') ?? '',
    ...(exportAgeBand ? { exportAgeBand } : {}),
    ...(bond ? { bond } : {}),
    ...(bondId ? { bondId } : {}),
    identityKey: identityKey(lastName, firstName, birthDate),
  };
}

function isSkipped(value: ImportRow | SkippedRow): value is SkippedRow {
  return 'reason' in value;
}

/**
 * Foglio dell'elenco adesioni → righe valide e righe saltate, oppure errore di file
 * (contracts/import-api.md). Funzione pura: nessun log, nessun accesso esterno.
 */
export function parseAdhesionSheet(input: SheetInput): ParsedImport {
  if (!input.sheetNames.includes(EXPECTED_SHEET)) return { ok: false, error: { kind: 'sheetNotFound' } };
  const [header, ...body] = input.rows;
  if (!header) return { ok: false, error: { kind: 'noRows' } };

  const located = locateColumns(header);
  if ('missing' in located) return { ok: false, error: { kind: 'missingColumns', columns: located.missing } };
  const { index } = located;

  const dataRows = body
    .map((cells, i) => ({ cells, rowNumber: i + 2 }))
    .filter(({ cells }) => !isBlankRow(cells));
  if (dataRows.length === 0) return { ok: false, error: { kind: 'noRows' } };

  const years = new Set(dataRows.map(({ cells }) => parseAssociationYear(cells[index['Anno Associativo']])));
  const [associationYear] = [...years];
  if (associationYear === undefined || years.size !== 1) return { ok: false, error: { kind: 'invalidYear' } };

  const rows: ImportRow[] = [];
  const skipped: SkippedRow[] = [];
  const firstRowOf = new Map<string, number>();
  for (const { cells, rowNumber } of dataRows) {
    const result = toImportRow(cells, rowNumber, index, input.date1904);
    if (isSkipped(result)) {
      skipped.push(result);
      continue;
    }
    const first = firstRowOf.get(result.identityKey);
    if (first !== undefined) {
      skipped.push({ rowNumber, reason: 'duplicate', duplicateOf: first });
      continue;
    }
    firstRowOf.set(result.identityKey, rowNumber);
    rows.push(result);
  }

  return { ok: true, associationYear, rows, skipped, totalRows: dataRows.length };
}
