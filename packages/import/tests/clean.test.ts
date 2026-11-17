import { describe, expect, it } from 'vitest';
import { cleanText, parseAssociationYear } from '../src/index';

describe('cleanText', () => {
  it('toglie spazi iniziali, finali e doppi', () => {
    expect(cleanText('GIOVANNI ')).toBe('GIOVANNI');
    expect(cleanText('  VIA MANZONI  8 ')).toBe('VIA MANZONI 8');
    expect(cleanText('S. GIOACCHINO - 440 ')).toBe('S. GIOACCHINO - 440');
  });

  it.each([null, undefined, '', "''", '   ', " '' "])('tratta %j come vuoto', (value) => {
    expect(cleanText(value)).toBeUndefined();
  });

  it('converte i numeri in testo senza decimali', () => {
    expect(cleanText(900002)).toBe('900002');
    expect(cleanText(900002.0)).toBe('900002');
    expect(cleanText(0)).toBe('0');
  });
});

describe('parseAssociationYear', () => {
  it('"Anno N" dell\'export = anno associativo (N−1)/N: "Anno 2026" → 2025 (glossario, corretto il 2026-11-17)', () => {
    expect(parseAssociationYear('Anno 2026')).toBe(2025);
    expect(parseAssociationYear(' Anno  2026 ')).toBe(2025);
    expect(parseAssociationYear('Anno 2027')).toBe(2026);
  });

  it.each(['2026', 'Anno', '', null, 'Anno 26', 'Anno 2026/27', 2026])('rifiuta %j', (value) => {
    expect(parseAssociationYear(value)).toBeUndefined();
  });
});
