import { describe, expect, it } from 'vitest';
import { bandFor } from '../src/age-band';
import { SCHEDULE_2026_27 as S } from '../src/schedules/2026-27';

describe('bandFor (età = anno associativo − anno di nascita)', () => {
  it.each([
    ['2021-01-01', undefined],
    ['2020-12-31', 'acr'],
    ['2012-01-01', 'acr'],
    ['2011-06-15', 'giovanissimi'],
    ['2008-12-31', 'giovanissimi'],
    ['2007-01-01', 'giovani'],
    ['1997-12-31', 'giovani'],
    ['1996-12-31', 'adulti'],
    ['1940-05-05', 'adulti'],
  ])('%s → %s', (birthDate, band) => {
    expect(bandFor(birthDate, S)).toBe(band);
  });
});
