import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import type { HouseholdFeeResult, HouseholdMember } from '../src/index';

const person = (id: string, birthDate: string): HouseholdMember => ({
  id,
  lastName: 'Test',
  firstName: id,
  birthDate,
});

const calc = (...members: HouseholdMember[]): HouseholdFeeResult =>
  calculateHouseholdFee({ associationYear: 2026, schedule: SCHEDULE_2026_27, members });

function calculated(r: HouseholdFeeResult) {
  if (r.status !== 'calculated') throw new Error(`atteso calculated, ottenuto ${r.status}`);
  return r;
}

/** Garanzia G3: totale = somma degli importi + eventuale pacchetto. */
function expectTotalConsistent(r: HouseholdFeeResult): void {
  const c = calculated(r);
  const sum =
    c.members.reduce((acc, m) => acc + (m.amountCents ?? 0), 0) + (c.acrPackage?.amountCents ?? 0);
  expect(c.totalCents).toBe(sum);
}

describe('US1 – scenari di accettazione', () => {
  it('1 persona (Adulto) → quota piena 26,00', () => {
    const r = calculated(calc(person('a', '1980-01-01')));
    expect(r.members).toEqual([
      { memberId: 'a', age: 46, band: 'adulti', fullCents: 2600, benefit: 'none', amountCents: 2600 },
    ]);
    expect(r.acrPackage).toBeUndefined();
    expect(r.totalCents).toBe(2600);
    expectTotalConsistent(r);
  });

  it('2 ACR → pacchetto 25,00, entrambi inAcrPackage senza importo', () => {
    const r = calculated(calc(person('young', '2018-05-05'), person('old', '2013-05-05')));
    expect(r.members.map((m) => [m.memberId, m.benefit, m.amountCents])).toEqual([
      ['old', 'inAcrPackage', undefined],
      ['young', 'inAcrPackage', undefined],
    ]);
    expect(r.members.every((m) => !('amountCents' in m))).toBe(true);
    expect(r.acrPackage).toEqual({ amountCents: 2500, memberIds: ['old', 'young'] });
    expect(r.totalCents).toBe(2500);
    expectTotalConsistent(r);
  });

  it('1 Adulto + 1 ACR → nessun sconto, 41,00', () => {
    const r = calculated(calc(person('a', '1975-01-01'), person('r', '2015-01-01')));
    expect(r.members.map((m) => m.benefit)).toEqual(['none', 'none']);
    expect(r.acrPackage).toBeUndefined();
    expect(r.totalCents).toBe(4100);
    expectTotalConsistent(r);
  });

  it('2 Adulti + 1 Giovane → giovane discount20 18,00, totale 70,00', () => {
    const r = calculated(
      calc(person('a1', '1970-01-01'), person('a2', '1972-01-01'), person('g', '2003-01-01')),
    );
    const g = r.members.find((m) => m.memberId === 'g');
    expect(g).toMatchObject({ benefit: 'discount20', amountCents: 1800, fullCents: 2200 });
    expect(r.totalCents).toBe(7000);
    expectTotalConsistent(r);
  });

  it('1 Adulto + 2 ACR → adulto pieno, ACR nel pacchetto, 51,00', () => {
    const r = calculated(
      calc(person('a', '1975-01-01'), person('r1', '2013-01-01'), person('r2', '2016-01-01')),
    );
    expect(r.members.find((m) => m.memberId === 'a')).toMatchObject({
      benefit: 'none',
      amountCents: 2600,
    });
    expect(r.members.filter((m) => m.benefit === 'inAcrPackage').map((m) => m.memberId)).toEqual([
      'r1',
      'r2',
    ]);
    expect(r.acrPackage).toEqual({ amountCents: 2500, memberIds: ['r1', 'r2'] });
    expect(r.totalCents).toBe(5100);
    expectTotalConsistent(r);
  });

  it('3 ACR → i due più anziani nel pacchetto, il più giovane discount20 12,00, 37,00', () => {
    const r = calculated(
      calc(person('r1', '2013-01-01'), person('r2', '2016-01-01'), person('r3', '2018-01-01')),
    );
    expect(r.members.map((m) => [m.memberId, m.benefit])).toEqual([
      ['r1', 'inAcrPackage'],
      ['r2', 'inAcrPackage'],
      ['r3', 'discount20'],
    ]);
    expect(r.members[2]?.amountCents).toBe(1200);
    expect(r.acrPackage).toEqual({ amountCents: 2500, memberIds: ['r1', 'r2'] });
    expect(r.totalCents).toBe(3700);
    expectTotalConsistent(r);
  });
});
