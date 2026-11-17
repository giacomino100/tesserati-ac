import { describe, expect, it } from 'vitest';
import { parseAdhesionSheet, REQUIRED_COLUMNS, type ParsedImport, type ParsedImportOk } from '../src/index';
import { acrRow, HEADERS, sheet, SHEET, type RowValues } from './sheet-builder';

function parse(rows: RowValues[], headers: readonly string[] = HEADERS, sheetNames = [SHEET]): ParsedImport {
  return parseAdhesionSheet({ sheetNames, rows: sheet(rows, headers), date1904: false });
}

function ok(result: ParsedImport): ParsedImportOk {
  if (!result.ok) throw new Error(`atteso ok, ottenuto ${JSON.stringify(result.error)}`);
  return result;
}

describe('parseAdhesionSheet – righe valide (P1, P11, P14)', () => {
  it('trasforma una riga nelle sole colonne necessarie', () => {
    const result = ok(parse([acrRow()]));
    expect(result.associationYear).toBe(2026);
    expect(result.totalRows).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(result.rows).toEqual([
      {
        rowNumber: 2,
        lastName: 'PROVA',
        firstName: 'ALFA',
        sex: 'F',
        birthDate: '2016-04-09',
        sector: 'RAGAZZI',
        exportAgeBand: '9/11',
        bond: 'C3',
        bondId: '900002',
        identityKey: 'PROVA|ALFA|2016-04-09',
      },
    ]);
  });

  it('non copia nessuna colonna esclusa o non necessaria (P14)', () => {
    const [row] = ok(parse([acrRow({ 'Cod. Fiscale': 'PRVLFA16D49G348X' })])).rows;
    expect(Object.keys(row!).sort()).toEqual(
      ['bond', 'bondId', 'birthDate', 'exportAgeBand', 'firstName', 'identityKey', 'lastName', 'rowNumber', 'sector', 'sex', 'taxCode'].sort(),
    );
  });

  it('pulisce i testi e tratta i vuoti come assenti (P11)', () => {
    const [row] = ok(
      parse([
        acrRow({
          Cognome: '  DE  PROVA ',
          Nome: 'ALFA ',
          Sesso: "''",
          "Fasce d'età": '',
          Legame: null,
          'N. Legame': "''",
          'Cod. Fiscale': 'abc',
        }),
      ]),
    ).rows;
    expect(row).toMatchObject({ lastName: 'DE PROVA', firstName: 'ALFA', identityKey: 'DE PROVA|ALFA|2016-04-09' });
    expect(row).not.toHaveProperty('sex');
    expect(row).not.toHaveProperty('exportAgeBand');
    expect(row).not.toHaveProperty('bond');
    expect(row).not.toHaveProperty('bondId');
    expect(row).not.toHaveProperty('taxCode');
  });

  it('salva il codice fiscale solo se di 16 caratteri alfanumerici, in maiuscolo', () => {
    const [row] = ok(parse([acrRow({ 'Cod. Fiscale': ' prvlfa16d49g348x ' })])).rows;
    expect(row?.taxCode).toBe('PRVLFA16D49G348X');
  });

  it('ignora un sesso diverso da M/F', () => {
    const [row] = ok(parse([acrRow({ Sesso: 'X' })])).rows;
    expect(row).not.toHaveProperty('sex');
  });

  it('accetta la data come seriale Excel', () => {
    const [row] = ok(parse([acrRow({ 'Data Nascita': 42469 })])).rows;
    expect(row?.birthDate).toBe('2016-04-09');
  });

  it('ignora le righe del tutto vuote', () => {
    const result = ok(parse([acrRow(), {}]));
    expect(result.totalRows).toBe(1);
    expect(result.rows).toHaveLength(1);
  });
});

describe('parseAdhesionSheet – colonne per nome (P3)', () => {
  it('colonne in ordine diverso e colonne extra danno lo stesso risultato', () => {
    const reordered: string[] = [...[...HEADERS].reverse(), 'Colonna Nuova'];
    const expected = ok(parse([acrRow()])).rows;
    expect(ok(parse([acrRow()], reordered)).rows).toEqual(expected);
  });

  it('accetta intestazioni con spazi in più', () => {
    const spaced = HEADERS.map((h) => (h === 'Cognome' ? ' Cognome ' : h));
    const rows = sheet([acrRow()]);
    rows[0] = spaced;
    expect(ok(parseAdhesionSheet({ sheetNames: [SHEET], rows, date1904: false })).rows).toHaveLength(1);
  });

  it('elenca le colonne necessarie', () => {
    expect(REQUIRED_COLUMNS).toEqual([
      'Anno Associativo', 'Cognome', 'Nome', 'Sesso', 'Data Nascita', 'Cod. Fiscale', 'Settore', "Fasce d'età",
      'Legame', 'N. Legame',
    ]);
  });
});

describe('parseAdhesionSheet – righe saltate (P8, P9)', () => {
  it('salta le righe senza cognome, nome o data e importa le altre', () => {
    const result = ok(
      parse([
        acrRow({ Nome: 'UNO' }),
        acrRow({ Nome: 'DUE', Cognome: '  ' }),
        acrRow({ Nome: null }),
        acrRow({ Nome: 'QUATTRO', 'Data Nascita': null }),
        acrRow({ Nome: 'CINQUE', 'Data Nascita': 'abc' }),
        acrRow({ Nome: 'SEI' }),
      ]),
    );
    expect(result.rows.map((r) => r.firstName)).toEqual(['UNO', 'SEI']);
    expect(result.totalRows).toBe(6);
    expect(result.skipped).toEqual([
      { rowNumber: 3, reason: 'missingLastName', firstName: 'DUE' },
      { rowNumber: 4, reason: 'missingFirstName', lastName: 'PROVA' },
      { rowNumber: 5, reason: 'missingBirthDate', lastName: 'PROVA', firstName: 'QUATTRO' },
      { rowNumber: 6, reason: 'invalidBirthDate', lastName: 'PROVA', firstName: 'CINQUE' },
    ]);
  });

  it('tiene la prima di due righe della stessa persona', () => {
    const result = ok(
      parse([
        acrRow({ Cognome: 'ROSSI  ', Nome: 'MARIO' }),
        acrRow({ Cognome: 'BIANCHI', Nome: 'LIA' }),
        acrRow({ Cognome: 'rossi', Nome: ' mario', 'Data Nascita': '2016-04-09' }),
      ]),
    );
    expect(result.rows.map((r) => r.rowNumber)).toEqual([2, 3]);
    expect(result.skipped).toEqual([
      { rowNumber: 4, reason: 'duplicate', duplicateOf: 2, lastName: 'rossi', firstName: 'mario' },
    ]);
  });

  it('importa le righe di altri settori o fuori età ACR (FR-012)', () => {
    const result = ok(
      parse([acrRow(), acrRow({ Nome: 'BETA', Settore: 'GIOVANI', "Fasce d'età": '15/18', 'Data Nascita': '01/01/2010' })]),
    );
    expect(result.rows.map((r) => r.sector)).toEqual(['RAGAZZI', 'GIOVANI']);
  });
});

describe('parseAdhesionSheet – specifica 006 (D10, D13)', () => {
  it('due righe con lo stesso codice fiscale valido: la seconda è un doppione della prima', () => {
    const result = ok(
      parse([
        acrRow({ Cognome: 'NERI', Nome: 'ANNA', 'Cod. Fiscale': 'NRENNA82S45G348X' }),
        acrRow({ Cognome: 'NERI', Nome: 'ANA', 'Cod. Fiscale': 'nrenna82s45g348x' }),
        acrRow({ Cognome: 'ALTRA', Nome: 'PERSONA' }),
      ]),
    );
    expect(result.rows.map((r) => r.rowNumber)).toEqual([2, 4]);
    expect(result.skipped).toEqual([
      { rowNumber: 3, reason: 'duplicate', duplicateOf: 2, lastName: 'NERI', firstName: 'ANA' },
    ]);
  });

  it('riga saltata senza cognome né nome: nessun nome', () => {
    const result = ok(parse([acrRow(), acrRow({ Cognome: null, Nome: "''" })]));
    expect(result.skipped).toEqual([{ rowNumber: 3, reason: 'missingLastName' }]);
  });
});
