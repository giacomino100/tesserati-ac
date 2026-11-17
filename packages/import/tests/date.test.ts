import { afterEach, describe, expect, it } from 'vitest';
import { toIsoDate } from '../src/index';

// 1965-03-12: 23813 giorni dal 1899-12-30 (sistema 1900), 22351 dal 1904-01-01 (sistema 1904).
const SERIAL_1900 = 23813;
const SERIAL_1904 = 22351;

describe('toIsoDate', () => {
  const originalTz = process.env['TZ'];
  afterEach(() => {
    process.env['TZ'] = originalTz;
  });

  it('converte un seriale Excel nel sistema 1900 e 1904', () => {
    expect(toIsoDate(SERIAL_1900, false)).toBe('1965-03-12');
    expect(toIsoDate(SERIAL_1904, true)).toBe('1965-03-12');
  });

  it('ignora l’ora nel seriale', () => {
    expect(toIsoDate(SERIAL_1900 + 0.99, false)).toBe('1965-03-12');
  });

  it('accetta testi GG/MM/AAAA e AAAA-MM-GG', () => {
    expect(toIsoDate('12/03/1965', false)).toBe('1965-03-12');
    expect(toIsoDate('2/3/1965', false)).toBe('1965-03-02');
    expect(toIsoDate('1965-03-12', false)).toBe('1965-03-12');
    expect(toIsoDate(' 1965-03-12 ', false)).toBe('1965-03-12');
  });

  it('gestisce gli anni bisestili', () => {
    expect(toIsoDate('29/02/2016', false)).toBe('2016-02-29');
    expect(toIsoDate('29/02/2015', false)).toBeUndefined();
    expect(toIsoDate(42429, false)).toBe('2016-02-29');
  });

  it.each(['31/02/2010', '00/01/2010', '12/13/2010', 'abc', '', null, undefined, -5, 0, 30, Number.NaN, true])(
    'rifiuta %j',
    (value) => {
      expect(toIsoDate(value, false)).toBeUndefined();
    },
  );

  it.each(['America/Los_Angeles', 'Pacific/Kiritimati', 'Europe/Rome'])('non dipende dal fuso (%s)', (tz) => {
    process.env['TZ'] = tz;
    expect(toIsoDate(SERIAL_1900, false)).toBe('1965-03-12');
    expect(toIsoDate('12/03/1965', false)).toBe('1965-03-12');
  });
});
