import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { SCHEDULE_2026_27 } from '@tesseramento/fees';
import { ageWarnings, parseAdhesionSheet, type ImportRow } from '../src/index';
import { acrRow, sheet, SHEET, type RowValues } from './sheet-builder';

function rows(values: RowValues[]): readonly ImportRow[] {
  const result = parseAdhesionSheet({ sheetNames: [SHEET], rows: sheet(values.map((v) => acrRow(v))), date1904: false });
  if (!result.ok) throw new Error('foglio di prova non valido');
  return result.rows;
}

function sample(name: string): readonly ImportRow[] {
  const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/${name}`, import.meta.url));
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
  const ws = wb.Sheets[SHEET];
  const data = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) : [];
  const result = parseAdhesionSheet({ sheetNames: wb.SheetNames, rows: data, date1904: false });
  if (!result.ok) throw new Error('file finto non valido');
  return result.rows;
}

describe('ageWarnings (research R7, FR-008)', () => {
  it('sotto l’età minima del listino', () => {
    const [w] = ageWarnings(rows([{ Cognome: 'GATTI', Nome: 'MIA', 'Data Nascita': '09/09/2022' }]), SCHEDULE_2026_27);
    expect(w).toMatchObject({ age: 4, kind: 'belowMinimumAge' });
    expect(w?.row.lastName).toBe('GATTI');
  });

  it('settore dell’export diverso dal gruppo del listino', () => {
    const warnings = ageWarnings(
      rows([
        { Nome: 'A', 'Data Nascita': '01/05/1996', Settore: 'GIOVANI' },
        { Nome: 'B', 'Data Nascita': '01/05/2010', Settore: 'RAGAZZI' },
        { Nome: 'C', 'Data Nascita': '01/05/2016', Settore: 'GIOVANI' },
      ]),
      SCHEDULE_2026_27,
    );
    expect(warnings.map((w) => [w.row.firstName, w.age, w.kind, w.expectedSector])).toEqual([
      ['A', 30, 'sectorMismatch', 'ADULTI'],
      ['B', 16, 'sectorMismatch', 'GIOVANI'],
      ['C', 10, 'sectorMismatch', 'RAGAZZI'],
    ]);
  });

  it('nessun avviso quando età e settore tornano', () => {
    expect(
      ageWarnings(
        rows([
          { Nome: 'A', 'Data Nascita': '01/05/2016', Settore: 'RAGAZZI' },
          { Nome: 'B', 'Data Nascita': '01/05/2010', Settore: 'GIOVANI' },
          { Nome: 'C', 'Data Nascita': '01/05/2001', Settore: 'GIOVANI' },
          { Nome: 'D', 'Data Nascita': '01/05/1970', Settore: 'ADULTI' },
        ]),
        SCHEDULE_2026_27,
      ),
    ).toEqual([]);
  });

  it('file ACR finto: esattamente 1 avviso, GATTI MIA di 4 anni (D15, FR-011)', () => {
    const warnings = ageWarnings(sample('ElencoAdesioni_ACR.xlsx'), SCHEDULE_2026_27);
    expect(warnings.map((w) => [w.row.lastName, w.row.firstName, w.age, w.kind])).toEqual([
      ['GATTI', 'MIA', 4, 'belowMinimumAge'],
    ]);
  });

  it.each(['ElencoAdesioni_Giovani.xlsx', 'ElencoAdesioni_Adulti.xlsx'])('%s: nessun avviso', (name) => {
    expect(ageWarnings(sample(name), SCHEDULE_2026_27)).toEqual([]);
  });
});
