import { describe, expect, it } from 'vitest';
import { formatEuros, parseEuros } from '../src/index';

describe('parseEuros (P1)', () => {
  it.each([
    ['26,5', 2650],
    ['26.50', 2650],
    ['26', 2600],
    ['0,01', 1],
    ['  26,00 ', 2600],
  ])('accetta "%s" come %i centesimi', (text, cents) => {
    expect(parseEuros(text)).toEqual({ ok: true, cents });
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['abc', 'notNumber'],
    ['26,', 'notNumber'],
    ['1.234,50', 'notNumber'],
    ['1,234.50', 'notNumber'],
    ['1,2,3', 'notNumber'],
    ['26,555', 'tooManyDecimals'],
    ['26.001', 'tooManyDecimals'],
    ['0', 'notPositive'],
    ['0,00', 'notPositive'],
    ['-3', 'notPositive'],
    ['-0,50', 'notPositive'],
  ])('rifiuta "%s" con %s', (text, code) => {
    expect(parseEuros(text)).toEqual({ ok: false, code });
  });
});

describe('formatEuros e andata e ritorno (P2)', () => {
  it('formatta con virgola e due decimali', () => {
    expect(formatEuros(2600)).toBe('26,00');
    expect(formatEuros(1)).toBe('0,01');
    expect(formatEuros(2650)).toBe('26,50');
  });

  it.each([1, 9, 10, 99, 100, 1234, 2500, 99999])('parseEuros(formatEuros(%i)) = %i', (n) => {
    expect(parseEuros(formatEuros(n))).toEqual({ ok: true, cents: n });
  });
});
