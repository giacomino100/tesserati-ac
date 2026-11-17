import { describe, expect, it } from 'vitest';
import { parseAdhesionSheet, planImport, type ParsedImportOk } from '../src/index';
import { acrRow, sheet, SHEET } from './sheet-builder';

function parsed(): ParsedImportOk {
  const result = parseAdhesionSheet({
    sheetNames: [SHEET],
    rows: sheet([
      acrRow({ Cognome: 'UNO' }),
      acrRow({ Cognome: 'DUE' }),
      acrRow({ Cognome: 'TRE', 'Data Nascita': null }),
    ]),
    date1904: false,
  });
  if (!result.ok) throw new Error('atteso ok');
  return result;
}

describe('planImport (P13)', () => {
  it('senza persone in archivio crea tutte le persone', () => {
    const plan = planImport(parsed(), new Map());
    expect(plan.associationYear).toBe(2026);
    expect(plan.importId).toBe('2026-ACR');
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO', 'DUE']);
    expect(plan.reusedPersons).toEqual([]);
    expect(plan.adhesions).toBe(2);
    expect(plan.skipped).toEqual([{ rowNumber: 4, reason: 'missingBirthDate' }]);
  });

  it('riusa la persona già presente e crea comunque la sua adesione', () => {
    const plan = planImport(parsed(), new Map([['DUE|ALFA|2016-04-09', 'persona-esistente']]));
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO']);
    expect(plan.reusedPersons).toEqual([
      { row: expect.objectContaining({ lastName: 'DUE' }), personId: 'persona-esistente' },
    ]);
    expect(plan.adhesions).toBe(2);
  });
});
