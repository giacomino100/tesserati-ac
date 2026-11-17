import { describe, expect, it } from 'vitest';
import { SCHEDULE_2026_27, type FeeSchedule } from '@tesseramento/fees';
import {
  compareWithSaved,
  householdFees,
  toSavedCalculated,
  yearTotals,
  type Household,
  type SavedHouseholdFee,
  type YearMember,
} from '../src/index';

const m = (personId: string, birthDate: string): YearMember => ({
  personId,
  lastName: personId.toUpperCase(),
  firstName: 'ALFA',
  birthDate,
  list: 'ADULTI',
});

const adults: Household = { key: 'f-a', familyId: 'a', members: [m('a1', '1970-01-01'), m('a2', '1972-01-01')] };
const kids: Household = { key: 'f-k', familyId: 'k', members: [m('k1', '2015-01-01'), m('k2', '2017-01-01')] };
const big: Household = {
  key: 'f-big',
  familyId: 'big',
  members: ['1','2','3','4','5'].map((i) => m(`b${i}`, `19${70 + Number(i)}-01-01`)),
};
const AT = new Date('2026-11-17T10:00:00Z');

function saveAll(households: Household[], schedule: FeeSchedule = SCHEDULE_2026_27): SavedHouseholdFee[] {
  return householdFees(households, schedule)
    .filter((f) => f.outcome.kind === 'calculated')
    .map((f) => ({ ...toSavedCalculated(f, 2026), savedAt: AT, savedBy: 'segreteria@example.org' }));
}

function manual(household: Household, cents: number): SavedHouseholdFee {
  return {
    key: household.key,
    associationYear: 2026,
    memberIds: household.members.map((x) => x.personId),
    kind: 'manual',
    manualCents: cents,
    note: 'Deciso dal consiglio',
    reason: 'householdTooLarge',
    totalCents: cents,
    savedAt: AT,
    savedBy: 'segreteria@example.org',
  };
}

describe('toSavedCalculated', () => {
  it('istantanea con componenti, righe, totale; nessun nome', () => {
    const [fee] = householdFees([kids], SCHEDULE_2026_27);
    const saved = toSavedCalculated(fee!, 2026);
    expect(saved).toMatchObject({ key: 'f-k', associationYear: 2026, memberIds: ['k1', 'k2'], kind: 'calculated', acrPackageCents: 2500, totalCents: 2500 });
    expect(JSON.stringify(saved)).not.toContain('K1 ');
    expect(saved.lines?.map((l) => l.memberId)).toEqual(['k1', 'k2']);
  });
});

describe('compareWithSaved (H5–H11)', () => {
  it('niente di salvato: tutti nuovi; il non previsto ha bisogno della quota manuale', () => {
    const result = compareWithSaved(householdFees([adults, big], SCHEDULE_2026_27), []);
    expect(result.map((r) => [r.key, r.status, r.needsManual])).toEqual([
      ['f-a', 'new', false],
      ['f-big', 'new', true],
    ]);
  });

  it('salvato uguale: invariato', () => {
    const result = compareWithSaved(householdFees([adults, kids], SCHEDULE_2026_27), saveAll([adults, kids]));
    expect(result.map((r) => r.status)).toEqual(['unchanged', 'unchanged']);
  });

  it('listino cambiato: da ricalcolare solo i nuclei con adulti', () => {
    const higher: FeeSchedule = {
      ...SCHEDULE_2026_27,
      bands: SCHEDULE_2026_27.bands.map((b) => (b.band === 'adulti' ? { ...b, fullCents: 2700 } : b)),
    };
    const result = compareWithSaved(householdFees([adults, kids], higher), saveAll([adults, kids]));
    expect(result.map((r) => [r.key, r.status])).toEqual([
      ['f-a', 'changed'],
      ['f-k', 'unchanged'],
    ]);
    expect(result[0]?.saved?.totalCents).toBe(5200);
    expect(result[0]?.current?.outcome.kind === 'calculated' && result[0].current.outcome.totalCents).toBe(5400);
  });

  it('componente tolto: la famiglia cambia e il componente è un nucleo nuovo', () => {
    const smaller: Household = { ...adults, members: [adults.members[0]!] };
    const single: Household = { key: 'p-a2', members: [adults.members[1]!] };
    const result = compareWithSaved(householdFees([smaller, single], SCHEDULE_2026_27), saveAll([adults]));
    expect(result.map((r) => [r.key, r.status])).toEqual([
      ['f-a', 'changed'],
      ['p-a2', 'new'],
    ]);
  });

  it('quota manuale con gli stessi componenti: valida', () => {
    const result = compareWithSaved(householdFees([big], SCHEDULE_2026_27), [manual(big, 14000)]);
    expect(result).toEqual([expect.objectContaining({ key: 'f-big', status: 'unchanged', needsManual: false })]);
  });

  it('quota manuale e componenti cambiati: da decidere di nuovo', () => {
    const bigger: Household = { ...big, members: [...big.members, m('b6', '1990-01-01')] };
    const result = compareWithSaved(householdFees([bigger], SCHEDULE_2026_27), [manual(big, 14000)]);
    expect(result).toEqual([expect.objectContaining({ key: 'f-big', status: 'changed', needsManual: true })]);
  });

  it('nucleo salvato che non esiste più', () => {
    const result = compareWithSaved(householdFees([adults], SCHEDULE_2026_27), saveAll([adults, kids]));
    expect(result.map((r) => [r.key, r.status])).toEqual([
      ['f-a', 'unchanged'],
      ['f-k', 'removed'],
    ]);
  });
});

describe('yearTotals (H12)', () => {
  it('somma calcolati e manuali validi, conta i mancanti e quelli da aggiornare; totale salvato a parte', () => {
    const comparisons = compareWithSaved(householdFees([adults, kids, big], SCHEDULE_2026_27), [
      ...saveAll([adults]),
      manual(big, 14000),
    ]);
    expect(yearTotals(comparisons)).toEqual({
      totalCents: 5200 + 2500 + 14000,
      savedTotalCents: 5200 + 14000,
      calculated: 2,
      manual: 1,
      missing: 0,
      toUpdate: 1,
    });
    const withoutManual = yearTotals(compareWithSaved(householdFees([big], SCHEDULE_2026_27), []));
    expect(withoutManual).toMatchObject({ totalCents: 0, missing: 1, calculated: 0 });
  });
});
