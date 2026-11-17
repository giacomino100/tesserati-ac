import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseAdhesionSheet, type ParsedImport } from '../src/index';
import { acrRow, HEADERS, sheet, SHEET, type RowValues } from './sheet-builder';

function parse(rows: RowValues[], headers: readonly string[] = HEADERS, sheetNames = [SHEET]): ParsedImport {
  return parseAdhesionSheet({ sheetNames, rows: sheet(rows, headers), date1904: false });
}

function sample(name: string): ParsedImport {
  const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/${name}`, import.meta.url));
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
  const ws = wb.Sheets[SHEET];
  const rows = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) : [];
  return parseAdhesionSheet({ sheetNames: wb.SheetNames, rows, date1904: Boolean(wb.Workbook?.WBProps?.date1904) });
}

describe('errori di file (P2, P4–P7, P10)', () => {
  it.each(['ElencoAdesioni_Giovani.xlsx', 'ElencoAdesioni_Adulti.xlsx'])('%s non è l’elenco ACR', (name) => {
    expect(sample(name)).toEqual({ ok: false, error: { kind: 'notAcr' } });
  });

  it('colonna Data Nascita mancante o rinominata', () => {
    const renamed = HEADERS.map((h) => (h === 'Data Nascita' ? 'Data di nascita' : h));
    expect(parse([acrRow()], renamed)).toEqual({ ok: false, error: { kind: 'missingColumns', columns: ['Data Nascita'] } });
  });

  it('più colonne mancanti: tutte elencate nell’ordine delle colonne necessarie', () => {
    const headers = HEADERS.filter((h) => h !== 'Settore' && h !== 'Cognome');
    expect(parse([acrRow()], headers)).toEqual({ ok: false, error: { kind: 'missingColumns', columns: ['Cognome', 'Settore'] } });
  });

  it('foglio con un altro nome', () => {
    expect(parse([acrRow()], HEADERS, ['Foglio1'])).toEqual({ ok: false, error: { kind: 'sheetNotFound' } });
  });

  it('solo intestazioni, o file vuoto', () => {
    expect(parse([])).toEqual({ ok: false, error: { kind: 'noRows' } });
    expect(parseAdhesionSheet({ sheetNames: [SHEET], rows: [], date1904: false })).toEqual({
      ok: false,
      error: { kind: 'noRows' },
    });
  });

  it('anni diversi nello stesso file', () => {
    expect(parse([acrRow(), acrRow({ Nome: 'BETA', 'Anno Associativo': 'Anno 2027' })])).toEqual({
      ok: false,
      error: { kind: 'mixedYears' },
    });
  });

  it.each(['2026', '', null, 'Anno'])('anno %j non valido', (year) => {
    expect(parse([acrRow({ 'Anno Associativo': year })])).toEqual({ ok: false, error: { kind: 'invalidYear' } });
  });

  it('nessuna riga RAGAZZI: non è l’elenco ACR', () => {
    expect(parse([acrRow({ Settore: 'GIOVANI' }), acrRow({ Nome: 'BETA', Settore: 'ADULTI' })])).toEqual({
      ok: false,
      error: { kind: 'notAcr' },
    });
  });

  it('tutte le righe da saltare: errore con l’elenco delle righe', () => {
    expect(parse([acrRow({ Nome: null }), acrRow({ 'Data Nascita': 'abc' })])).toEqual({
      ok: false,
      error: {
        kind: 'allRowsSkipped',
        skipped: [
          { rowNumber: 2, reason: 'missingFirstName' },
          { rowNumber: 3, reason: 'invalidBirthDate' },
        ],
      },
    });
  });
});
