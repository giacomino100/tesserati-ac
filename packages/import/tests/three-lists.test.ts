import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseAdhesionSheet, planImport, type AdhesionList, type ArchivedPerson, type ImportRow } from '../src/index';

const FILES: Record<AdhesionList, string> = {
  ACR: 'ElencoAdesioni_ACR.xlsx',
  GIOVANI: 'ElencoAdesioni_Giovani.xlsx',
  ADULTI: 'ElencoAdesioni_Adulti.xlsx',
};

/** Componenti dei nuclei finti secondo docs/dominio/excel-esempio/README.md. */
const HOUSEHOLDS: Record<string, number> = {
  '900001': 2, '900002': 3, '900003': 4, '900004': 6, '900005': 2,
  '900006': 3, '900007': 2, '900008': 3, '900009': 2,
};

function parse(list: AdhesionList) {
  const path = fileURLToPath(new URL(`../../../docs/dominio/excel-esempio/${FILES[list]}`, import.meta.url));
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', dense: true });
  const ws = wb.Sheets['ElencoAdesioniExcel'];
  const rows = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) : [];
  const result = parseAdhesionSheet({ sheetNames: wb.SheetNames, rows, date1904: Boolean(wb.Workbook?.WBProps?.date1904) });
  if (!result.ok) throw new Error(`${list}: atteso ok`);
  return result;
}

/** Applica in memoria gli import in sequenza, come farebbe l'archivio. */
function importAll(order: AdhesionList[]) {
  const archive: ArchivedPerson[] = [];
  const adhesions = new Map<string, { list: AdhesionList; row: ImportRow }>();
  let skipped = 0;
  let duplicates = 0;
  for (const list of order) {
    const parsed = parse(list);
    expect(parsed.recognition).toEqual({ kind: 'recognized', list });
    const plan = planImport(
      parsed,
      list,
      archive,
      new Map([...adhesions].map(([id, a]) => [id, a.list])),
    );
    skipped += plan.skipped.length;
    duplicates += plan.duplicates.length;
    for (const row of plan.newPersons) {
      const id = `p${archive.length + 1}`;
      archive.push({
        id,
        lastName: row.lastName,
        firstName: row.firstName,
        birthDate: row.birthDate,
        identityKey: row.identityKey,
        ...(row.taxCode ? { taxCode: row.taxCode } : {}),
      });
      adhesions.set(id, { list, row });
    }
    for (const { row, personId } of plan.reusedPersons) adhesions.set(personId, { list, row });
  }
  return { persons: archive, adhesions, skipped, duplicates };
}

describe('i tre file finti del 2026 (Q10, SC-001, SC-002)', () => {
  it.each([
    [['ACR', 'GIOVANI', 'ADULTI']],
    [['ADULTI', 'GIOVANI', 'ACR']],
  ] as AdhesionList[][][])('in ordine %j: 37 persone, 37 adesioni, nuclei completi, nessun doppione (D14)', (order) => {
    const { persons, adhesions, skipped, duplicates } = importAll(order);
    expect(persons).toHaveLength(37);
    expect(duplicates).toBe(0);
    expect(adhesions.size).toBe(37);
    expect(skipped).toBe(0);
    const members = new Map<string, number>();
    for (const { row } of adhesions.values()) {
      if (row.bondId) members.set(row.bondId, (members.get(row.bondId) ?? 0) + 1);
    }
    expect(Object.fromEntries(members)).toEqual(HOUSEHOLDS);
  });
});
