import type { HouseholdMember } from '../../src/types';

/**
 * Nuclei e singoli FINTI di docs/dominio/excel-esempio/genera_esempi.py
 * (date di nascita copiate da quello script). Nessun dato reale.
 */
export interface SampleHousehold {
  readonly name: string;
  readonly members: readonly HouseholdMember[];
  /** Totale atteso in centesimi, oppure il motivo di "non previsto". */
  readonly expected:
    | { readonly totalCents: number }
    | { readonly notCovered: 'householdTooLarge' | 'memberUnderMinAge' };
}

const p = (id: string, lastName: string, firstName: string, birthDate: string): HouseholdMember => ({
  id,
  lastName,
  firstName,
  birthDate,
});

export const SAMPLE_HOUSEHOLDS: readonly SampleHousehold[] = [
  {
    name: 'nucleo 900001 (2 adulti)',
    expected: { totalCents: 5200 },
    members: [
      p('900001-1', 'ROSSI', 'MARIO', '1965-03-12'),
      p('900001-2', 'BIANCHI', 'LUCIA', '1968-07-02'),
    ],
  },
  {
    name: 'nucleo 900002 (2 adulti + 1 ACR)',
    expected: { totalCents: 6400 },
    members: [
      p('900002-1', 'VERDI', 'PAOLO', '1980-01-20'),
      p('900002-2', 'NERI', 'ANNA', '1982-11-05'),
      p('900002-3', 'VERDI', 'SOFIA', '2016-04-09'),
    ],
  },
  {
    name: 'nucleo 900003 (2 adulti + 2 ACR)',
    expected: { totalCents: 6400 },
    members: [
      p('900003-1', 'GALLO', 'LUCA', '1978-06-30'),
      p('900003-2', 'CONTI', 'MARTA', '1981-02-14'),
      p('900003-3', 'GALLO', 'TOMMASO', '2014-09-01'),
      p('900003-4', 'GALLO', 'GIULIA', '2019-12-24'),
    ],
  },
  {
    name: 'nucleo 900004 (6 persone)',
    expected: { notCovered: 'householdTooLarge' },
    members: [
      p('900004-1', 'FERRARA', 'ANTONIO', '1970-05-05'),
      p('900004-2', 'LOMBARDO', 'ROSA', '1972-08-18'),
      p('900004-3', 'FERRARA', 'MARCO', '1999-10-10'),
      p('900004-4', 'FERRARA', 'CHIARA', '2005-03-03'),
      p('900004-5', 'FERRARA', 'DAVIDE', '2010-01-15'),
      p('900004-6', 'FERRARA', 'ELISA', '2013-06-06'),
    ],
  },
  {
    name: 'nucleo 900005 (2 fratelli ACR)',
    expected: { totalCents: 2500 },
    members: [
      p('900005-1', 'MARINO', 'LEONARDO', '2015-02-02'),
      p('900005-2', 'MARINO', 'EMMA', '2018-10-30'),
    ],
  },
  {
    name: 'nucleo 900006 (1 giovanissimo + 2 ACR)',
    expected: { totalCents: 4100 },
    members: [
      p('900006-1', 'RICCI', 'ALESSANDRO', '2009-04-04'),
      p('900006-2', 'RICCI', 'GIORGIA', '2013-07-07'),
      p('900006-3', 'RICCI', 'FRANCESCO', '2017-09-09'),
    ],
  },
  {
    name: 'nucleo 900007 (1 adulto + 1 ACR)',
    expected: { totalCents: 4100 },
    members: [
      p('900007-1', 'COLOMBO', 'GIUSEPPE', '1948-12-01'),
      p('900007-2', 'ESPOSITO', 'MATTIA', '2016-05-25'),
    ],
  },
  {
    name: 'nucleo 900008 (1 adulto + 1 giovanissimo + 1 ACR)',
    expected: { totalCents: 5400 },
    members: [
      p('900008-1', 'ROMANO', 'FRANCESCA', '1985-09-19'),
      p('900008-2', 'GRECO', 'NICOLO', '2011-11-11'),
      p('900008-3', 'GRECO', 'AURORA', '2020-01-01'),
    ],
  },
  {
    name: 'nucleo 900009 (1 adulto + 1 giovane)',
    expected: { totalCents: 4800 },
    members: [
      p('900009-1', 'BRUNO', 'STEFANO', '1993-04-22'),
      p('900009-2', 'RIZZO', 'VALERIA', '1997-08-08'),
    ],
  },
  { name: 'singolo 1955', expected: { totalCents: 2600 }, members: [p('S1', 'MORETTI', 'CARLA', '1955-01-30')] },
  { name: 'singolo 1960', expected: { totalCents: 2600 }, members: [p('S2', 'BARBIERI', 'SALVATORE', '1960-10-03')] },
  { name: 'singolo 1990', expected: { totalCents: 2600 }, members: [p('S3', 'FONTANA', 'ILARIA', '1990-06-15')] },
  { name: 'singolo 2001', expected: { totalCents: 2200 }, members: [p('S4', 'SANTORO', 'GABRIELE', '2001-02-28')] },
  { name: 'singolo 2008', expected: { totalCents: 1600 }, members: [p('S5', 'MARIANI', 'ALICE', '2008-12-12')] },
  { name: 'singolo 2012', expected: { totalCents: 1500 }, members: [p('S6', 'RINALDI', 'PIETRO', '2012-03-03')] },
  { name: 'singolo 2017', expected: { totalCents: 1500 }, members: [p('S7', 'CARUSO', 'BEATRICE', '2017-05-05')] },
  { name: 'singolo 2019', expected: { totalCents: 1500 }, members: [p('S8', 'FERRI', 'SAMUELE', '2019-07-07')] },
  { name: 'singolo 2015', expected: { totalCents: 1500 }, members: [p('S10', 'PELLEGRINO', 'GIOVANNI', '2015-08-08')] },
  {
    name: 'singola 2022 (sotto i 6 anni)',
    expected: { notCovered: 'memberUnderMinAge' },
    members: [p('S9', 'GATTI', 'MIA', '2022-09-09')],
  },
];
