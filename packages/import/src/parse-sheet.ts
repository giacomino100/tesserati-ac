import { cleanText, parseAssociationYear } from './clean';
import { EXPECTED_SHEET, locateColumns, type ColumnIndex, type RequiredColumn } from './columns';
import { toIsoDate } from './date';
import { identityKey } from './identity';
import { recognizeList } from './lists';
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
  const firstName = text('Nome');
  // Cognome e nome accompagnano le righe saltate solo per mostrarle a schermo (specifica 006, FR-007).
  const names = { ...(lastName ? { lastName } : {}), ...(firstName ? { firstName } : {}) };
  if (!lastName) return { rowNumber, reason: 'missingLastName', ...names };
  if (!firstName) return { rowNumber, reason: 'missingFirstName', ...names };
  const rawDate = cell('Data Nascita');
  if (cleanText(rawDate) === undefined) return { rowNumber, reason: 'missingBirthDate', ...names };
  const birthDate = toIsoDate(typeof rawDate === 'string' ? rawDate.trim() : rawDate, date1904);
  if (!birthDate) return { rowNumber, reason: 'invalidBirthDate', ...names };

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
  if (years.has(undefined)) return { ok: false, error: { kind: 'invalidYear' } };
  if (years.size !== 1) return { ok: false, error: { kind: 'mixedYears' } };
  const [associationYear] = [...years] as [number];

  // L'elenco (ACR, Giovani, Adulti) è il settore più frequente; le righe di altri settori si importano
  // comunque con il loro settore (specifica 005, research R1).
  const recognition = recognizeList(dataRows.map(({ cells }) => cleanText(cells[index['Settore']])));
  if (!recognition) return { ok: false, error: { kind: 'unknownList' } };

  const rows: ImportRow[] = [];
  const skipped: SkippedRow[] = [];
  const firstRowOf = new Map<string, number>();
  const firstRowOfTaxCode = new Map<string, number>();
  for (const { cells, rowNumber } of dataRows) {
    const result = toImportRow(cells, rowNumber, index, input.date1904);
    if (isSkipped(result)) {
      skipped.push(result);
      continue;
    }
    // Stessa persona due volte nello stesso file: stessa chiave, o stesso codice fiscale (specifica 006).
    const first =
      firstRowOf.get(result.identityKey) ?? (result.taxCode ? firstRowOfTaxCode.get(result.taxCode) : undefined);
    if (first !== undefined) {
      skipped.push({
        rowNumber,
        reason: 'duplicate',
        duplicateOf: first,
        lastName: result.lastName,
        firstName: result.firstName,
      });
      continue;
    }
    firstRowOf.set(result.identityKey, rowNumber);
    if (result.taxCode) firstRowOfTaxCode.set(result.taxCode, rowNumber);
    rows.push(result);
  }

  if (rows.length === 0) return { ok: false, error: { kind: 'allRowsSkipped', skipped } };
  return { ok: true, associationYear, rows, skipped, totalRows: dataRows.length, recognition };
}
