import { describe, expect, it } from 'vitest';
import { ageFor, bandForAge, SCHEDULE_2026_27 } from '../src/index';

describe('esportazioni ageFor e bandForAge (specifica 006)', () => {
  it('età = anno associativo − anno di nascita', () => {
    expect(ageFor('1996-05-01', 2026)).toBe(30);
    expect(ageFor('2022-09-09', 2026)).toBe(4);
  });

  it('fascia per età secondo il listino', () => {
    expect(bandForAge(30, SCHEDULE_2026_27)).toBe('adulti');
    expect(bandForAge(16, SCHEDULE_2026_27)).toBe('giovanissimi');
    expect(bandForAge(4, SCHEDULE_2026_27)).toBeUndefined();
  });
});
