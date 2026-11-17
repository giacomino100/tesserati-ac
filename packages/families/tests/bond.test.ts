import { describe, expect, it } from 'vitest';
import { parseBond } from '../src/index';

describe('parseBond (F1)', () => {
  it('lettera e numero di componenti', () => {
    expect(parseBond('C3')).toEqual({ kind: 'C', size: 3 });
    expect(parseBond(' n2 ')).toEqual({ kind: 'N', size: 2 });
    expect(parseBond('C10')).toEqual({ kind: 'C', size: 10 });
  });

  it.each(['X', '', '3', 'CC3', undefined])('%j non è un Legame', (value) => {
    expect(parseBond(value)).toBeUndefined();
  });
});
