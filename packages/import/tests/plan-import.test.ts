import { describe, expect, it } from 'vitest';
import {
  identityKey,
  parseAdhesionSheet,
  planImport,
  type ArchivedPerson,
  type DuplicateDecision,
  type ParsedImportOk,
} from '../src/index';
import { acrRow, sheet, SHEET, type RowValues } from './sheet-builder';

function parsed(rows: RowValues[]): ParsedImportOk {
  const result = parseAdhesionSheet({ sheetNames: [SHEET], rows: sheet(rows), date1904: false });
  if (!result.ok) throw new Error('atteso ok');
  return result;
}

/** Persona inventata in archivio. */
function person(id: string, lastName: string, firstName: string, birthDate: string, over: Partial<ArchivedPerson> = {}): ArchivedPerson {
  return { id, lastName, firstName, birthDate, identityKey: identityKey(lastName, firstName, birthDate), ...over };
}

const base = () =>
  parsed([
    acrRow({ Cognome: 'UNO' }),
    acrRow({ Cognome: 'DUE' }),
    acrRow({ Cognome: 'TRE', 'Data Nascita': null }),
    acrRow({ Cognome: 'QUATTRO' }),
  ]);

describe('planImport (P13, Q8, Q9)', () => {
  it('senza persone in archivio crea tutte le persone', () => {
    const plan = planImport(base(), 'ACR', []);
    expect(plan.associationYear).toBe(2026);
    expect(plan.list).toBe('ACR');
    expect(plan.importId).toBe('2026-ACR');
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO', 'DUE', 'QUATTRO']);
    expect(plan.reusedPersons).toEqual([]);
    expect(plan.adhesions).toBe(3);
    expect(plan.skipped).toEqual([{ rowNumber: 4, reason: 'missingBirthDate', lastName: 'TRE', firstName: 'ALFA' }]);
    expect(plan.duplicates).toEqual([]);
    expect(plan.pendingDuplicates).toBe(0);
    expect(plan.taxCodeMatches).toEqual([]);
    expect(plan.confirmedSame).toBe(0);
  });

  it('riusa la persona già presente senza adesione nell’anno e crea la sua adesione', () => {
    const plan = planImport(base(), 'ACR', [person('persona-esistente', 'DUE', 'ALFA', '2016-04-09')]);
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO', 'QUATTRO']);
    expect(plan.reusedPersons).toEqual([
      { row: expect.objectContaining({ lastName: 'DUE' }), personId: 'persona-esistente' },
    ]);
    expect(plan.adhesions).toBe(3);
  });

  it('usa l’elenco scelto per l’ID del segno', () => {
    const plan = planImport(base(), 'ADULTI', []);
    expect(plan.importId).toBe('2026-ADULTI');
  });
});

describe('planImport – persona già con un’adesione nell’anno (Q7, 005)', () => {
  it('salta la riga, la elenca con l’elenco di provenienza, nell’ordine delle righe', () => {
    const plan = planImport(
      base(),
      'ADULTI',
      [person('p-due', 'DUE', 'ALFA', '2016-04-09'), person('p-quattro', 'QUATTRO', 'ALFA', '2016-04-09')],
      new Map([['p-due', 'ACR']]),
    );
    expect(plan.newPersons.map((r) => r.lastName)).toEqual(['UNO']);
    expect(plan.reusedPersons.map((r) => r.personId)).toEqual(['p-quattro']);
    expect(plan.adhesions).toBe(2);
    expect(plan.skipped.map((s) => [s.rowNumber, s.reason])).toEqual([
      [3, 'alreadyInYear'],
      [4, 'missingBirthDate'],
    ]);
    expect(plan.skipped[0]).toMatchObject({ fromList: 'ACR', lastName: 'DUE', firstName: 'ALFA' });
  });
});

describe('planImport – possibili doppioni (D4–D7, D11, D12, specifica 006)', () => {
  const rows = () =>
    parsed([
      acrRow({ Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965', Settore: 'ADULTI' }),
      acrRow({ Cognome: 'BIANCHI', Nome: 'LUCA', 'Data Nascita': '05/11/1983', Settore: 'ADULTI' }),
    ]);
  const archive = [
    person('rossi', 'ROSSI', 'MARIA', '1965-03-12', { lastAdhesion: { year: 2025, list: 'ADULTI' } }),
    person('bianchi', 'BIANCHI', 'LUCA', '1982-11-05'),
    person('bianchi-2', 'BIANCHI', 'LUCIA', '1983-11-05'),
  ];
  const plan = (decisions: [number, DuplicateDecision][] = [], adhesions: [string, 'ACR' | 'GIOVANI' | 'ADULTI'][] = []) =>
    planImport(rows(), 'ADULTI', archive, new Map(adhesions), new Map(decisions));

  it('senza scelte: due doppioni in attesa, nessuna persona e nessuna adesione per quelle righe', () => {
    const p = plan();
    expect(p.duplicates.map((d) => [d.row.rowNumber, d.candidates.map((c) => c.id), d.decision])).toEqual([
      [2, ['rossi'], undefined],
      [3, ['bianchi', 'bianchi-2'], undefined],
    ]);
    expect(p.pendingDuplicates).toBe(2);
    expect(p.newPersons).toEqual([]);
    expect(p.reusedPersons).toEqual([]);
    expect(p.adhesions).toBe(0);
  });

  it('"Stessa persona": riusata, conteggiata tra i doppioni confermati', () => {
    const p = plan([[2, 'rossi'], [3, 'new']]);
    expect(p.pendingDuplicates).toBe(0);
    expect(p.reusedPersons.map((r) => r.personId)).toEqual(['rossi']);
    expect(p.newPersons.map((r) => r.lastName)).toEqual(['BIANCHI']);
    expect(p.confirmedSame).toBe(1);
    expect(p.adhesions).toBe(2);
    expect(p.duplicates[0]?.decision).toBe('rossi');
  });

  it('due righe decise sulla stessa persona: la seconda è un doppione della prima', () => {
    const p = planImport(
      parsed([
        acrRow({ Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965' }),
        acrRow({ Cognome: 'ROSSI', Nome: 'MARA', 'Data Nascita': '12/03/1965' }),
      ]),
      'ACR',
      archive,
      new Map(),
      new Map([[2, 'rossi'], [3, 'rossi']]),
    );
    expect(p.reusedPersons.map((r) => r.row.rowNumber)).toEqual([2]);
    expect(p.skipped).toEqual([expect.objectContaining({ rowNumber: 3, reason: 'duplicate', duplicateOf: 2 })]);
  });

  it('"Stessa persona" verso chi ha già un’adesione nell’anno: già importata', () => {
    const p = plan([[2, 'rossi'], [3, 'new']], [['rossi', 'ACR']]);
    expect(p.reusedPersons).toEqual([]);
    expect(p.skipped).toEqual([expect.objectContaining({ rowNumber: 2, reason: 'alreadyInYear', fromList: 'ACR' })]);
  });

  it('una scelta su un ID che non è tra i candidati viene ignorata', () => {
    expect(plan([[2, 'bianchi']]).duplicates[0]?.decision).toBeUndefined();
  });
});

describe('planImport – codice fiscale (D8, D9, specifica 006)', () => {
  const archive = [
    person('neri', 'NERI', 'ANNA', '1982-11-05', { taxCode: 'NRENNA82S45G348X' }),
    person('verdi', 'VERDI', 'PAOLO', '1980-01-20', { taxCode: 'VRDPLA80A20G348X' }),
  ];

  it('codice fiscale in archivio con nome diverso: attribuita e segnalata', () => {
    const p = planImport(
      parsed([acrRow({ Cognome: 'NERI', Nome: 'ANA', 'Data Nascita': '05/11/1982', 'Cod. Fiscale': 'NRENNA82S45G348X' })]),
      'ACR',
      archive,
    );
    expect(p.reusedPersons.map((r) => r.personId)).toEqual(['neri']);
    expect(p.duplicates).toEqual([]);
    expect(p.taxCodeMatches).toEqual([
      { row: expect.objectContaining({ firstName: 'ANA' }), person: archive[0], sameKey: false },
    ]);
  });

  it('chiave di una persona ma codice fiscale di un’altra: vale il codice fiscale', () => {
    const p = planImport(
      parsed([acrRow({ Cognome: 'NERI', Nome: 'ANNA', 'Data Nascita': '05/11/1982', 'Cod. Fiscale': 'VRDPLA80A20G348X' })]),
      'ACR',
      archive,
    );
    expect(p.reusedPersons.map((r) => r.personId)).toEqual(['verdi']);
    expect(p.taxCodeMatches[0]?.sameKey).toBe(false);
  });

  it('stesso codice fiscale e stessa chiave: sameKey vero', () => {
    const p = planImport(
      parsed([acrRow({ Cognome: 'NERI', Nome: 'ANNA', 'Data Nascita': '05/11/1982', 'Cod. Fiscale': 'NRENNA82S45G348X' })]),
      'ACR',
      archive,
    );
    expect(p.taxCodeMatches[0]?.sameKey).toBe(true);
  });
});

describe('planImport – persone già riconfermate (008, I2–I3) o inserite a mano (009, N11)', () => {
  const archive = () => [person('p-due', 'DUE', 'ALFA', '2016-04-09'), person('p-quattro', 'QUATTRO', 'ALFA', '2016-04-09')];

  it('salta le righe delle persone riconfermate con il motivo alreadyRenewed', () => {
    const plan = planImport(base(), 'ACR', archive(), new Map([['p-due', 'ACR']]), new Map(), new Map([['p-due', 'riconferma']]));
    expect(plan.reusedPersons.map((r) => r.personId)).toEqual(['p-quattro']);
    expect(plan.skipped[0]).toMatchObject({ rowNumber: 3, reason: 'alreadyRenewed', lastName: 'DUE', firstName: 'ALFA' });
    expect(plan.adhesions).toBe(2);
  });

  it('N11: persona inserita a mano → alreadyAdded', () => {
    const plan = planImport(base(), 'ACR', archive(), new Map([['p-due', 'ACR']]), new Map(), new Map([['p-due', 'nuovo']]));
    expect(plan.skipped[0]).toMatchObject({ rowNumber: 3, reason: 'alreadyAdded', lastName: 'DUE' });
  });

  it('senza persone riconfermate il comportamento non cambia', () => {
    const plan = planImport(base(), 'ACR', archive(), new Map([['p-due', 'GIOVANI']]));
    expect(plan.skipped[0]).toMatchObject({ rowNumber: 3, reason: 'alreadyInYear', fromList: 'GIOVANI' });
  });
});
