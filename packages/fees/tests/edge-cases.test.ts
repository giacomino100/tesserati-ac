import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import type { HouseholdFeeInput, HouseholdMember } from '../src/index';

const person = (id: string, birthDate: string, lastName = 'Test', firstName = id): HouseholdMember => ({
  id,
  lastName,
  firstName,
  birthDate,
});

const input = (members: readonly HouseholdMember[], associationYear = 2026): HouseholdFeeInput => ({
  associationYear,
  schedule: SCHEDULE_2026_27,
  members,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('edge cases', () => {
  it('nucleo vuoto → calculated, totale 0, nessun pacchetto', () => {
    const r = calculateHouseholdFee(input([]));
    expect(r).toEqual({ status: 'calculated', members: [], totalCents: 0 });
    expect('acrPackage' in r).toBe(false);
  });

  it('G1: stesso risultato per qualunque ordine in ingresso', () => {
    const members = [
      person('a', '1970-01-01'),
      person('b', '1972-01-01'),
      person('c', '2003-01-01'),
      person('d', '2015-01-01'),
    ];
    const reference = calculateHouseholdFee(input(members));
    const permutations = [
      [3, 2, 1, 0],
      [1, 3, 0, 2],
      [2, 0, 3, 1],
    ];
    for (const p of permutations) {
      expect(calculateHouseholdFee(input(p.map((i) => members[i] as HouseholdMember)))).toEqual(
        reference,
      );
    }
  });

  it('G5: l’input congelato non viene modificato né fa lanciare errori', () => {
    const i = deepFreeze(
      input([person('b', '2015-01-01'), person('a', '1970-01-01'), person('c', '2003-01-01')]),
    );
    const snapshot = JSON.stringify(i);
    expect(() => calculateHouseholdFee(i)).not.toThrow();
    expect(JSON.stringify(i)).toBe(snapshot);
  });

  it('gemelli (stessa data): il beneficio va sempre allo stesso componente', () => {
    const adult = person('a', '1980-01-01');
    const t1 = person('t1', '2015-03-03', 'Rossi', 'Anna');
    const t2 = person('t2', '2015-03-03', 'Rossi', 'Bruno');
    const r1 = calculateHouseholdFee(input([adult, t1, t2]));
    const r2 = calculateHouseholdFee(input([t2, adult, t1]));
    expect(r1).toEqual(r2);
    // Con 1 Adulto + 2 ACR si applica il pacchetto; verifichiamo anche 3 ACR gemelli.
    const w = [
      person('w1', '2015-03-03', 'Rossi', 'Anna'),
      person('w2', '2015-03-03', 'Rossi', 'Bruno'),
      person('w3', '2015-03-03', 'Rossi', 'Carlo'),
    ];
    const a = calculateHouseholdFee(input(w));
    const b = calculateHouseholdFee(input([w[2] as HouseholdMember, w[0] as HouseholdMember, w[1] as HouseholdMember]));
    expect(a).toEqual(b);
    if (a.status !== 'calculated') throw new Error('atteso calculated');
    expect(a.members.find((m) => m.benefit === 'discount20')?.memberId).toBe('w3');
  });

  it('listino di un altro anno → invalidInput, nessun importo', () => {
    const r = calculateHouseholdFee(input([person('a', '1980-01-01')], 2027));
    expect(r).toEqual({ status: 'invalidInput', errors: [{ code: 'scheduleYearMismatch' }] });
  });

  it('data di nascita non valida → invalidInput, nessun importo', () => {
    const r = calculateHouseholdFee(input([person('a', '2015-02-30')]));
    expect(r).toEqual({
      status: 'invalidInput',
      errors: [{ code: 'invalidBirthDate', memberId: 'a' }],
    });
  });
});
