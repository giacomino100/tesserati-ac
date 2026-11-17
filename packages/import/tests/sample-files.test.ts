import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseAdhesionSheet, type ParsedImport, type ParsedImportOk, type SheetInput } from '../src/index';

/** Legge un file finto come fa l'app (workbook-reader.ts): valori grezzi, prima riga = intestazioni. */
function readSample(name: string): SheetInput {
  const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/${name}`, import.meta.url));
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
  const ws = wb.Sheets['ElencoAdesioniExcel'];
  const rows = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) : [];
  return { sheetNames: wb.SheetNames, rows, date1904: Boolean(wb.Workbook?.WBProps?.date1904) };
}

function ok(result: ParsedImport): ParsedImportOk {
  if (!result.ok) throw new Error(`atteso ok, ottenuto ${JSON.stringify(result.error)}`);
  return result;
}

describe('file finto ElencoAdesioni_ACR.xlsx (P1, FR-016)', () => {
  const result = ok(parseAdhesionSheet(readSample('ElencoAdesioni_ACR.xlsx')));
  const find = (lastName: string, firstName: string) =>
    result.rows.find((r) => r.lastName === lastName && r.firstName === firstName);

  it('dà 15 adesioni del 2026, nessuna riga saltata', () => {
    expect(result.associationYear).toBe(2026);
    expect(result.totalRows).toBe(15);
    expect(result.rows).toHaveLength(15);
    expect(result.skipped).toEqual([]);
  });

  it('pulisce lo spazio finale nel nome', () => {
    expect(find('PELLEGRINO', 'GIOVANNI')).toBeDefined();
  });

  it('importa anche la bambina della fascia 0/5 (FR-012)', () => {
    expect(find('GATTI', 'MIA')?.exportAgeBand).toBe('0/5');
  });

  it('legge legame, N. legame e data di nascita', () => {
    expect(find('VERDI', 'SOFIA')).toMatchObject({ bond: 'C3', bondId: '900002', birthDate: '2016-04-09', sex: 'F' });
  });

  it('non porta colonne escluse', () => {
    for (const row of result.rows) {
      expect(Object.keys(row).every((k) =>
        ['rowNumber', 'lastName', 'firstName', 'sex', 'birthDate', 'taxCode', 'sector', 'exportAgeBand', 'bond', 'bondId', 'identityKey'].includes(k),
      )).toBe(true);
    }
  });
});
