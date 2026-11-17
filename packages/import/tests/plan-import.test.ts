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
      acrRow({ Cognome: 'QUATTRO' }),
    ]),
    date1904: false,
  });
  if (!result.ok) throw new Error('atteso ok');
  return result;
}

describe('planImport (P13, Q8, Q9)', () => {
  it('senza persone in archivio crea tutte le persone', () => {
    const plan = planImport(parsed(), 'ACR', new Map());
    expect(plan.associationYear).toBe(2026);
    expect(plan.list).toBe('ACR');
    expect(plan.importId).toBe('2026-ACR');
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO', 'DUE', 'QUATTRO']);
    expect(plan.reusedPersons).toEqual([]);
    expect(plan.adhesions).toBe(3);
    expect(plan.skipped).toEqual([{ rowNumber: 4, reason: 'missingBirthDate' }]);
  });

  it('riusa la persona già presente senza adesione nell’anno e crea la sua adesione', () => {
    const plan = planImport(parsed(), 'ACR', new Map([['DUE|ALFA|2016-04-09', 'persona-esistente']]));
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO', 'QUATTRO']);
    expect(plan.reusedPersons).toEqual([
      { row: expect.objectContaining({ lastName: 'DUE' }), personId: 'persona-esistente' },
    ]);
    expect(plan.adhesions).toBe(3);
  });

  it('usa l’elenco scelto per l’ID del segno', () => {
    const plan = planImport(parsed(), 'ADULTI', new Map());
    expect(plan.list).toBe('ADULTI');
    expect(plan.importId).toBe('2026-ADULTI');
  });
});

describe('planImport – persona già con un’adesione nell’anno (Q7, FR-006 della 005)', () => {
  it('salta la riga, la elenca con l’elenco di provenienza, nell’ordine delle righe', () => {
    const plan = planImport(
      parsed(),
      'ADULTI',
      new Map([
        ['DUE|ALFA|2016-04-09', 'p-due'],
        ['QUATTRO|ALFA|2016-04-09', 'p-quattro'],
      ]),
      new Map([['p-due', 'ACR']]),
    );
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO']);
    expect(plan.reusedPersons.map((r) => r.personId)).toEqual(['p-quattro']);
    expect(plan.adhesions).toBe(2);
    expect(plan.skipped).toEqual([
      { rowNumber: 3, reason: 'alreadyInYear', fromList: 'ACR' },
      { rowNumber: 4, reason: 'missingBirthDate' },
    ]);
  });
});
