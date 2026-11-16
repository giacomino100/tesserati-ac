import { describe, expect, it } from 'vitest';
import { MAX_PLAUSIBLE_AGE, validateInput } from '../src/validate';
import { SCHEDULE_2026_27 as S } from '../src/schedules/2026-27';
import type { HouseholdFeeInput } from '../src/types';

const input = (birthDates: string[], year = 2026): HouseholdFeeInput => ({
  associationYear: year,
  schedule: S,
  members: birthDates.map((birthDate, i) => ({
    id: `m${i}`,
    lastName: 'Test',
    firstName: 'Test',
    birthDate,
  })),
});

describe('validateInput', () => {
  it('input valido → nessun errore', () => {
    expect(validateInput(input(['1980-05-05', '2015-12-31']))).toEqual([]);
  });

  it('nucleo vuoto è valido', () => {
    expect(validateInput(input([]))).toEqual([]);
  });

  it('listino di un altro anno → scheduleYearMismatch', () => {
    expect(validateInput(input(['1980-05-05'], 2027))).toEqual([{ code: 'scheduleYearMismatch' }]);
  });

  it.each(['1980/05/05', '05-05-1980', '', 'abcd-ef-gh', '2015-02-30', '2015-13-01', '2015-00-10'])(
    'data non valida %j → invalidBirthDate',
    (d) => {
      expect(validateInput(input([d]))).toEqual([{ code: 'invalidBirthDate', memberId: 'm0' }]);
    },
  );

  it('29 febbraio di anno bisestile è valido', () => {
    expect(validateInput(input(['2016-02-29']))).toEqual([]);
  });

  it('età massima plausibile', () => {
    expect(MAX_PLAUSIBLE_AGE).toBe(110);
    expect(validateInput(input(['1916-01-01']))).toEqual([]);
    expect(validateInput(input(['1915-12-31']))).toEqual([
      { code: 'invalidBirthDate', memberId: 'm0' },
    ]);
  });

  it('nascita dopo il 31/12 dell’anno associativo → birthDateAfterYear', () => {
    expect(validateInput(input(['2026-12-31']))).toEqual([]);
    expect(validateInput(input(['2027-01-01']))).toEqual([
      { code: 'birthDateAfterYear', memberId: 'm0' },
    ]);
  });

  it('id duplicati → duplicateMemberId', () => {
    const i: HouseholdFeeInput = {
      associationYear: 2026,
      schedule: S,
      members: [
        { id: 'x', lastName: 'A', firstName: 'A', birthDate: '1980-01-01' },
        { id: 'x', lastName: 'B', firstName: 'B', birthDate: '1981-01-01' },
      ],
    };
    expect(validateInput(i)).toEqual([{ code: 'duplicateMemberId', memberId: 'x' }]);
  });
});
