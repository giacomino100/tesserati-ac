import { describe, expect, it } from 'vitest';
import {
  datesSimilar,
  editDistance,
  findCandidates,
  identityKey,
  namesSimilar,
  parseAdhesionSheet,
  type ArchivedPerson,
  type ImportRow,
} from '../src/index';
import { acrRow, sheet, SHEET, type RowValues } from './sheet-builder';

function rowOf(values: RowValues): ImportRow {
  const result = parseAdhesionSheet({ sheetNames: [SHEET], rows: sheet([acrRow(values)]), date1904: false });
  if (!result.ok || !result.rows[0]) throw new Error('riga di prova non valida');
  return result.rows[0];
}

function person(id: string, lastName: string, firstName: string, birthDate: string): ArchivedPerson {
  return { id, lastName, firstName, birthDate, identityKey: identityKey(lastName, firstName, birthDate) };
}

describe('editDistance', () => {
  it.each([
    ['MARIA', 'MARIA', 0],
    ['MARIA', 'MARA', 1],
    ['LUCA', 'LUCIA', 1],
    ['MARCO', 'MARTA', 2],
    ['', 'ABC', 3],
    ['GIOVANNI', 'GIOVANNA', 1],
  ])('%s / %s = %i', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
    expect(editDistance(b, a)).toBe(d);
  });
});

describe('namesSimilar (D1, D2, regole-famiglia.md §2)', () => {
  it.each([
    ['MARIA', 'MARA'],
    ['ANNA', 'ANA'],
    ['LUCA', 'LUCIA'],
    ['MARCO', 'MARTA'],
    ['MARIA', 'MARIA GRAZIA'],
    ['GRAZIA', 'MARIA GRAZIA'],
    ['ANNA', 'MARIA ANNA LUISA'],
    ['Nicolò', 'NICOLA'],
    ['MARIA  GRAZIA', 'maria'],
  ])('%s / %s: simili', (a, b) => {
    expect(namesSimilar(a, b)).toBe(true);
    expect(namesSimilar(b, a)).toBe(true);
  });

  it.each([
    ['ANNA', 'GIOVANNA'],
    ['LUCA', 'MATTEO'],
    ['MARIA', 'MARIA'],
    ['maria ', 'MARIA'],
    ['FRANCESCO', 'FEDERICO'],
  ])('%s / %s: non simili', (a, b) => {
    expect(namesSimilar(a, b)).toBe(false);
  });
});

describe('datesSimilar (D3)', () => {
  it.each([
    ['1965-03-12', '1965-03-13'],
    ['1982-11-05', '1983-11-05'],
    ['1982-11-05', '1982-05-11'],
  ])('%s / %s: simili', (a, b) => {
    expect(datesSimilar(a, b)).toBe(true);
    expect(datesSimilar(b, a)).toBe(true);
  });

  it.each([
    ['1982-11-05', '1984-12-05'],
    ['1982-11-05', '1982-11-05'],
    ['1982-05-05', '1982-05-05'],
    ['1982-11-05', '1992-12-05'],
  ])('%s / %s: non simili', (a, b) => {
    expect(datesSimilar(a, b)).toBe(false);
  });
});

describe('findCandidates (research R3)', () => {
  const archive = [
    person('rossi-maria', 'ROSSI', 'MARIA', '1965-03-12'),
    person('rossi-mario', 'ROSSI', 'MARIO', '1970-01-01'),
    person('bianchi', 'BIANCHI', 'LUCA', '1982-11-05'),
    person('verdi', 'VERDI', 'MARIA GRAZIA', '1965-03-12'),
  ];

  it('stessa data e cognome, nome simile', () => {
    const row = rowOf({ Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965' });
    expect(findCandidates(row, archive).map((p) => p.id)).toEqual(['rossi-maria']);
  });

  it('stesso cognome e nome, data simile', () => {
    const row = rowOf({ Cognome: 'BIANCHI', Nome: 'LUCA', 'Data Nascita': '11/05/1982' });
    expect(findCandidates(row, archive).map((p) => p.id)).toEqual(['bianchi']);
  });

  it('mai la persona con la stessa chiave, mai cognomi diversi', () => {
    const exact = rowOf({ Cognome: 'ROSSI', Nome: 'MARIA', 'Data Nascita': '12/03/1965' });
    expect(findCandidates(exact, archive)).toEqual([]);
    const other = rowOf({ Cognome: 'NERI', Nome: 'MARIA GRAZIA', 'Data Nascita': '12/03/1965' });
    expect(findCandidates(other, archive)).toEqual([]);
  });

  it('nome simile ma data diversa e non simile: nessun candidato', () => {
    const row = rowOf({ Cognome: 'ROSSI', Nome: 'MARIA GRAZIA', 'Data Nascita': '01/01/1990' });
    expect(findCandidates(row, archive)).toEqual([]);
  });
});
