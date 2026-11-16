import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import type { HouseholdFeeResult, HouseholdMember } from '../src/index';

const person = (id: string, birthDate: string): HouseholdMember => ({
  id,
  lastName: 'Test',
  firstName: id,
  birthDate,
});

function calc(...members: HouseholdMember[]) {
  const r: HouseholdFeeResult = calculateHouseholdFee({
    associationYear: 2026,
    schedule: SCHEDULE_2026_27,
    members,
  });
  if (r.status !== 'calculated') throw new Error(`atteso calculated, ottenuto ${r.status}`);
  return r;
}

describe('US2 – nucleo di 4 persone', () => {
  it('2 Adulti + 1 Giovane + 1 ACR → giovane discount20 18,00, ACR gratis, 70,00', () => {
    const r = calc(
      person('a1', '1970-01-01'),
      person('a2', '1972-01-01'),
      person('g', '2003-01-01'),
      person('r', '2015-01-01'),
    );
    expect(r.members.find((m) => m.memberId === 'g')).toMatchObject({
      benefit: 'discount20',
      amountCents: 1800,
    });
    expect(r.members.find((m) => m.memberId === 'r')).toMatchObject({
      benefit: 'free',
      amountCents: 0,
    });
    expect(r.totalCents).toBe(7000);
  });

  it('2 Adulti + 2 ACR → regola dei 4, nessun pacchetto ACR, 64,00', () => {
    const r = calc(
      person('a1', '1970-01-01'),
      person('a2', '1972-01-01'),
      person('r1', '2013-01-01'),
      person('r2', '2016-01-01'),
    );
    expect(r.acrPackage).toBeUndefined();
    expect(r.members.find((m) => m.memberId === 'r1')).toMatchObject({
      benefit: 'discount20',
      amountCents: 1200,
    });
    expect(r.members.find((m) => m.memberId === 'r2')).toMatchObject({
      benefit: 'free',
      amountCents: 0,
    });
    expect(r.totalCents).toBe(6400);
  });

  it('1 Adulto + Giovane 2000 + Giovane 2003 + Giovanissimo → il 3° è il giovane del 2003, 66,00', () => {
    const r = calc(
      person('a', '1975-01-01'),
      person('g2000', '2000-01-01'),
      person('g2003', '2003-01-01'),
      person('gg', '2009-01-01'),
    );
    expect(r.members.find((m) => m.memberId === 'g2003')).toMatchObject({
      benefit: 'discount20',
      amountCents: 1800,
    });
    expect(r.members.find((m) => m.memberId === 'gg')).toMatchObject({ benefit: 'free' });
    expect(r.members.find((m) => m.memberId === 'g2000')).toMatchObject({ benefit: 'none' });
    expect(r.totalCents).toBe(6600);
  });
});
