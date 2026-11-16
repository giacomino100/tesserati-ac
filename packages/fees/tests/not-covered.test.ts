import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import type { HouseholdMember } from '../src/index';

const person = (id: string, birthDate: string): HouseholdMember => ({
  id,
  lastName: 'Test',
  firstName: id,
  birthDate,
});

const calc = (...members: HouseholdMember[]) =>
  calculateHouseholdFee({ associationYear: 2026, schedule: SCHEDULE_2026_27, members });

const adults = (n: number) =>
  Array.from({ length: n }, (_, i) => person(`a${i}`, `${1960 + i}-01-01`));

function expectNoAmounts(r: ReturnType<typeof calc>): void {
  expect(r).not.toHaveProperty('totalCents');
  expect(r).not.toHaveProperty('acrPackage');
  if (r.status === 'notCovered') {
    for (const m of r.members) {
      expect(m).not.toHaveProperty('amountCents');
      expect(m).not.toHaveProperty('fullCents');
    }
  }
}

describe('not covered', () => {
  it('5 componenti → householdTooLarge', () => {
    const r = calc(...adults(5));
    expect(r).toMatchObject({ status: 'notCovered', reasons: ['householdTooLarge'] });
    if (r.status === 'notCovered') expect(r.members).toHaveLength(5);
    expectNoAmounts(r);
  });

  it('6 componenti → householdTooLarge', () => {
    const r = calc(...adults(6));
    expect(r).toMatchObject({ status: 'notCovered', reasons: ['householdTooLarge'] });
    expectNoAmounts(r);
  });

  it('2 Adulti + bambino nato nel 2022 → memberUnderMinAge, tutto il nucleo non previsto', () => {
    const r = calc(person('a1', '1970-01-01'), person('a2', '1972-01-01'), person('kid', '2022-09-09'));
    expect(r).toEqual({
      status: 'notCovered',
      reasons: ['memberUnderMinAge'],
      members: [
        { memberId: 'a1', age: 56, band: 'adulti' },
        { memberId: 'a2', age: 54, band: 'adulti' },
        { memberId: 'kid', age: 4 },
      ],
    });
    expectNoAmounts(r);
  });

  it('bambino singolo nato nel 2022 → memberUnderMinAge', () => {
    const r = calc(person('kid', '2022-09-09'));
    expect(r).toEqual({
      status: 'notCovered',
      reasons: ['memberUnderMinAge'],
      members: [{ memberId: 'kid', age: 4 }],
    });
  });

  it('6 componenti di cui uno nato nel 2022 → entrambi i motivi', () => {
    const r = calc(...adults(5), person('kid', '2022-09-09'));
    expect(r.status).toBe('notCovered');
    if (r.status === 'notCovered') {
      expect([...r.reasons].sort()).toEqual(['householdTooLarge', 'memberUnderMinAge']);
      expect(r.members).toHaveLength(6);
      expect(r.members.map((m) => typeof m.age)).toEqual(Array(6).fill('number'));
    }
    expectNoAmounts(r);
  });
});
