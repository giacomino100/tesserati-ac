import type { HouseholdMember } from '../../src/types';

/**
 * I 29 esempi di docs/dominio/regole-quote.md §3 (3.1: casi 1–18, 3.2: casi 19–29).
 * Persone finte: solo anni di nascita scelti per cadere nelle fasce 2026/27.
 * Se un'aspettativa non coincide con il documento, vale il documento.
 */
export interface ExampleCase {
  readonly caseNumber: number;
  readonly description: string;
  readonly members: readonly HouseholdMember[];
  readonly expectedTotalCents: number;
}

type Band = 'A' | 'G' | 'GG' | 'R'; // Adulto, Giovane, Giovanissimo, ACR

const YEARS: Record<Band, readonly number[]> = {
  A: [1960, 1965, 1970, 1975],
  G: [2000, 2003, 2005, 1998],
  GG: [2008, 2009, 2011],
  R: [2013, 2016, 2018],
};

function nucleus(caseNumber: number, bands: readonly Band[]): HouseholdMember[] {
  const used: Record<Band, number> = { A: 0, G: 0, GG: 0, R: 0 };
  return bands.map((band, i) => {
    const year = YEARS[band][used[band]++];
    if (year === undefined) throw new Error(`fixture: anni insufficienti per ${band}`);
    return {
      id: `c${caseNumber}-${i + 1}`,
      lastName: `Cognome${caseNumber}`,
      firstName: `Nome${i + 1}`,
      birthDate: `${year}-06-15`,
    };
  });
}

const make = (
  caseNumber: number,
  description: string,
  bands: readonly Band[],
  totalEuro: number,
): ExampleCase => ({
  caseNumber,
  description,
  members: nucleus(caseNumber, bands),
  expectedTotalCents: Math.round(totalEuro * 100),
});

export const EXAMPLES: readonly ExampleCase[] = [
  // §3.1 Casistica del PDF
  make(1, '2 Adulti + 1 Giovane', ['A', 'A', 'G'], 70),
  make(2, '2 Adulti + 1 Giovanissimo', ['A', 'A', 'GG'], 65),
  make(3, '2 Adulti + 1 ACR', ['A', 'A', 'R'], 64),
  make(4, '1 Adulto + 2 Giovani', ['A', 'G', 'G'], 66),
  make(5, '1 Adulto + 2 Giovanissimi', ['A', 'GG', 'GG'], 55),
  make(6, '1 Adulto + 2 ACR', ['A', 'R', 'R'], 51),
  make(7, '1 Adulto + 1 Giovane + 1 ACR', ['A', 'G', 'R'], 60),
  make(8, '1 Adulto + 1 Giovane + 1 Giovanissimo', ['A', 'G', 'GG'], 61),
  make(9, '2 Giovani + 1 ACR', ['G', 'G', 'R'], 56),
  make(10, '1 Giovane + 2 ACR', ['G', 'R', 'R'], 47),
  make(11, '2 Giovani + 1 Giovanissimo', ['G', 'G', 'GG'], 57),
  make(12, '1 Giovane + 2 Giovanissimi', ['G', 'GG', 'GG'], 51),
  make(13, '1 Giovane + 1 Giovanissimo + 1 ACR', ['G', 'GG', 'R'], 50),
  make(14, '1 Giovanissimo + 2 ACR', ['GG', 'R', 'R'], 41),
  make(15, '3 Giovani', ['G', 'G', 'G'], 62),
  make(16, '3 Giovanissimi', ['GG', 'GG', 'GG'], 45),
  make(17, '3 ACR', ['R', 'R', 'R'], 37),
  make(18, '3 Adulti', ['A', 'A', 'A'], 73),
  // §3.2 Applicazione diretta delle regole del PDF
  make(19, '1 Adulto', ['A'], 26),
  make(20, '2 Adulti', ['A', 'A'], 52),
  make(21, '2 ACR', ['R', 'R'], 25),
  make(22, '1 Adulto + 1 ACR', ['A', 'R'], 41),
  make(23, '1 Adulto + 1 Giovanissimo + 1 ACR', ['A', 'GG', 'R'], 54),
  make(24, '2 Giovanissimi + 1 ACR', ['GG', 'GG', 'R'], 44),
  make(25, '2 Adulti + 1 Giovane + 1 ACR', ['A', 'A', 'G', 'R'], 70),
  make(26, '2 Adulti + 2 ACR', ['A', 'A', 'R', 'R'], 64),
  make(27, '4 Adulti', ['A', 'A', 'A', 'A'], 73),
  // Caso 28: i due Giovani sono nati nel 2000 e nel 2003 (il 3° è quello del 2003)
  make(28, '1 Adulto + 1 Giovane (2000) + 1 Giovane (2003) + 1 Giovanissimo', ['A', 'G', 'G', 'GG'], 66),
  // Caso 29: il nato nel 1996 ha 30 anni → Adulto
  {
    caseNumber: 29,
    description: '2 Adulti + 1 nato nel 1996',
    members: [
      ...nucleus(29, ['A', 'A']),
      { id: 'c29-3', lastName: 'Cognome29', firstName: 'Nome3', birthDate: '1996-06-15' },
    ],
    expectedTotalCents: 7300,
  },
];
