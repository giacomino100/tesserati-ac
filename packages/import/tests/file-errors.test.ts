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
  it.each([
    ['ElencoAdesioni_ACR.xlsx', 'ACR'],
    ['ElencoAdesioni_Giovani.xlsx', 'GIOVANI'],
    ['ElencoAdesioni_Adulti.xlsx', 'ADULTI'],
  ])('%s: elenco riconosciuto %s (Q1–Q3, specifica 005)', (name, list) => {
    const result = sample(name);
    expect(result.ok && result.recognition).toEqual({ kind: 'recognized', list });
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

  it('settore più frequente sconosciuto: elenco non riconoscibile (Q6)', () => {
    expect(parse([acrRow({ Settore: 'ALTRO' }), acrRow({ Nome: 'BETA', Settore: 'ALTRO' }), acrRow({ Nome: 'GAMMA' })])).toEqual({
      ok: false,
      error: { kind: 'unknownList' },
    });
    expect(parse([acrRow({ Settore: 'ALTRO' }), acrRow({ Nome: 'BETA', Settore: 'GIOVANI' })])).toEqual({
      ok: false,
      error: { kind: 'unknownList' },
    });
  });

  it('3 GIOVANI + 1 ADULTI: elenco Giovani, la riga ADULTI tiene il suo settore (Q5)', () => {
    const result = parse([
      acrRow({ Settore: 'GIOVANI', Nome: 'A' }),
      acrRow({ Settore: 'GIOVANI', Nome: 'B' }),
      acrRow({ Settore: 'GIOVANI', Nome: 'C' }),
      acrRow({ Settore: 'ADULTI', Nome: 'D' }),
    ]);
    if (!result.ok) throw new Error('atteso ok');
    expect(result.recognition).toEqual({ kind: 'recognized', list: 'GIOVANI' });
    expect(result.rows.map((r) => r.sector)).toEqual(['GIOVANI', 'GIOVANI', 'GIOVANI', 'ADULTI']);
  });

  it('2 GIOVANI + 2 ADULTI: parità, scelta all’utente (Q4)', () => {
    const result = parse([
      acrRow({ Settore: 'ADULTI', Nome: 'A' }),
      acrRow({ Settore: 'GIOVANI', Nome: 'B' }),
      acrRow({ Settore: 'ADULTI', Nome: 'C' }),
      acrRow({ Settore: 'GIOVANI', Nome: 'D' }),
    ]);
    expect(result.ok && result.recognition).toEqual({ kind: 'tie', candidates: ['GIOVANI', 'ADULTI'] });
  });

  it('tutte le righe da saltare: errore con l’elenco delle righe', () => {
    expect(parse([acrRow({ Nome: null }), acrRow({ 'Data Nascita': 'abc' })])).toEqual({
      ok: false,
      error: {
        kind: 'allRowsSkipped',
        skipped: [
          { rowNumber: 2, reason: 'missingFirstName', lastName: 'PROVA' },
          { rowNumber: 3, reason: 'invalidBirthDate', lastName: 'PROVA', firstName: 'ALFA' },
        ],
      },
    });
  });
});
