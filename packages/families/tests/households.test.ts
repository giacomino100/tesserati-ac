import { describe, expect, it } from 'vitest';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import { EXAMPLES } from '../../fees/tests/fixtures/examples';
import {
  householdFees,
  householdsOfYear,
  suggestFamilies,
  type ConfirmedFamily,
  type YearMember,
} from '../src/index';
import { allSamples, family, membershipsOf } from './helpers';

/** Conferma tutte le famiglie suggerite, come "Conferma tutte" della 007. */
function confirmAll(members: YearMember[]) {
  const suggested = suggestFamilies(members, [], new Map()).suggested.filter((s) => s.confirmable);
  const confirmed: ConfirmedFamily[] = suggested.map((s) =>
    family(`fam-${s.bondId}`, s.members.map((m) => m.personId), { bondId: s.bondId }),
  );
  return suggestFamilies(members, confirmed, membershipsOf(...confirmed));
}

/** Il listino come torna dall'archivio (oggetto semplice, nessun riferimento al codice). */
const storedSchedule = (): FeeSchedule => JSON.parse(JSON.stringify(SCHEDULE_2026_27)) as FeeSchedule;

describe('householdsOfYear (H1, H2)', () => {
  it('9 famiglie confermate + 10 singoli = 19 nuclei', () => {
    const result = householdsOfYear(confirmAll(allSamples()));
    expect(result.households).toHaveLength(19);
    expect(result.households.filter((h) => h.key.startsWith('f-'))).toHaveLength(9);
    expect(result.households.filter((h) => h.key.startsWith('p-'))).toHaveLength(10);
    expect(result.unconfirmedSuggested).toBe(0);
    const verdi = result.households.find((h) => h.key === 'f-fam-900002')!;
    expect(verdi.bondId).toBe('900002');
    expect(verdi.members.map((m) => m.birthDate)).toEqual([...verdi.members.map((m) => m.birthDate)].sort());
  });

  it('senza famiglie confermate: 37 nuclei da 1 e 9 famiglie suggerite non confermate', () => {
    const result = householdsOfYear(suggestFamilies(allSamples(), [], new Map()));
    expect(result.households).toHaveLength(37);
    expect(result.households.every((h) => h.members.length === 1 && h.key.startsWith('p-'))).toBe(true);
    expect(result.unconfirmedSuggested).toBe(9);
  });
});

describe('householdFees (H3, SC-002)', () => {
  it('dati finti 2026: 17 nuclei calcolati per 565,00 €, 2 non previsti', () => {
    const fees = householdFees(householdsOfYear(confirmAll(allSamples())).households, storedSchedule());
    const calculated = fees.filter((f) => f.outcome.kind === 'calculated');
    expect(calculated).toHaveLength(17);
    expect(calculated.reduce((sum, f) => sum + (f.outcome.kind === 'calculated' ? f.outcome.totalCents : 0), 0)).toBe(56500);
    const notCovered = fees.filter((f) => f.outcome.kind === 'notCovered');
    expect(notCovered.map((f) => [f.household.key.startsWith('f-') ? f.household.bondId : f.household.members[0]!.lastName, f.outcome.kind === 'notCovered' && f.outcome.reason])).toEqual([
      ['900004', 'householdTooLarge'],
      ['GATTI', 'memberUnderMinAge'],
    ]);
  });

  it('famiglia 900003: 26 + 26 + 12 (sconto) + 0 (gratis) = 64,00 €', () => {
    const fees = householdFees(householdsOfYear(confirmAll(allSamples())).households, storedSchedule());
    const f = fees.find((x) => x.household.key === 'f-fam-900003')!;
    expect(f.outcome.kind === 'calculated' && f.outcome.lines.map((l) => [l.benefit, l.amountCents])).toEqual([
      ['none', 2600],
      ['none', 2600],
      ['discount20', 1200],
      ['free', 0],
    ]);
    expect(f.outcome.kind === 'calculated' && f.outcome.totalCents).toBe(6400);
  });

  it('famiglia 900005: pacchetto 2 ACR 25,00 €', () => {
    const fees = householdFees(householdsOfYear(confirmAll(allSamples())).households, storedSchedule());
    const f = fees.find((x) => x.household.key === 'f-fam-900005')!;
    expect(f.outcome.kind === 'calculated' && f.outcome.acrPackageCents).toBe(2500);
  });

  it('data di nascita successiva all’anno: non previsto con motivo invalidInput (regole-quote.md §4)', () => {
    const [fee] = householdFees(
      [{ key: 'p-x', members: [{ personId: 'x', lastName: 'X', firstName: 'Y', birthDate: '2030-01-01', list: 'ACR' }] }],
      storedSchedule(),
    );
    expect(fee!.outcome).toEqual({ kind: 'notCovered', reason: 'invalidInput' });
  });

  it('listino di un altro anno: errore interno, non un caso non previsto', () => {
    const [fee] = householdFees(
      [{ key: 'p-x', members: [{ personId: 'x', lastName: 'X', firstName: 'Y', birthDate: '2016-01-01', list: 'ACR' }] }],
      { ...storedSchedule(), associationYear: 2027 },
      2026,
    );
    expect(fee!.outcome).toEqual({ kind: 'error' });
  });
});

describe('i 29 esempi di regole-quote.md passando da famiglie e listino in archivio (H4, SC-001)', () => {
  it.each(EXAMPLES.map((e) => [e.caseNumber, e] as const))('esempio %i', (_, example) => {
    const members: YearMember[] = example.members.map((m) => ({ ...m, personId: m.id, list: 'ADULTI', bondId: `b${example.caseNumber}` }));
    const view =
      members.length >= 2
        ? (() => {
            const f = family(`fam-${example.caseNumber}`, members.map((m) => m.personId), { bondId: `b${example.caseNumber}` });
            return suggestFamilies(members, [f], membershipsOf(f));
          })()
        : suggestFamilies(members, [], new Map());
    const [fee] = householdFees(householdsOfYear(view).households, storedSchedule());
    expect(fee!.outcome.kind === 'calculated' && fee!.outcome.totalCents).toBe(example.expectedTotalCents);
  });
});
