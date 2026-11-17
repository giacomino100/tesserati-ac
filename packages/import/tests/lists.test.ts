import { describe, expect, it } from 'vitest';
import {
  acrImportId,
  ADHESION_LISTS,
  importId,
  listLabel,
  listOfImportId,
  recognizeList,
  sectorOf,
} from '../src/index';

describe('elenchi', () => {
  it('elenchi, settori ed etichette', () => {
    expect(ADHESION_LISTS).toEqual(['ACR', 'GIOVANI', 'ADULTI']);
    expect(ADHESION_LISTS.map(sectorOf)).toEqual(['RAGAZZI', 'GIOVANI', 'ADULTI']);
    expect(ADHESION_LISTS.map(listLabel)).toEqual(['ACR', 'Giovani', 'Adulti']);
  });

  it('ID del segno di import', () => {
    expect(importId(2026, 'GIOVANI')).toBe('2026-GIOVANI');
    expect(acrImportId(2026)).toBe('2026-ACR');
    expect(listOfImportId('2026-ADULTI')).toBe('ADULTI');
    expect(listOfImportId('2026-ACR')).toBe('ACR');
    expect(listOfImportId('2026-ALTRO')).toBeUndefined();
    expect(listOfImportId('ACR')).toBeUndefined();
  });
});

describe('recognizeList (research R1)', () => {
  it('riconosce il settore più frequente', () => {
    expect(recognizeList(['GIOVANI', 'GIOVANI', 'ADULTI'])).toEqual({ kind: 'recognized', list: 'GIOVANI' });
    expect(recognizeList(['RAGAZZI'])).toEqual({ kind: 'recognized', list: 'ACR' });
    expect(recognizeList([' giovani ', 'GIOVANI'])).toEqual({ kind: 'recognized', list: 'GIOVANI' });
  });

  it('parità tra settori noti: candidati nell’ordine degli elenchi', () => {
    expect(recognizeList(['ADULTI', 'GIOVANI'])).toEqual({ kind: 'tie', candidates: ['GIOVANI', 'ADULTI'] });
    expect(recognizeList(['ADULTI', 'RAGAZZI', 'GIOVANI'])).toEqual({
      kind: 'tie',
      candidates: ['ACR', 'GIOVANI', 'ADULTI'],
    });
  });

  it('settore sconosciuto tra i più frequenti o nessun settore: non riconosciuto', () => {
    expect(recognizeList(['ALTRO', 'ALTRO', 'GIOVANI'])).toBeUndefined();
    expect(recognizeList(['ALTRO', 'GIOVANI'])).toBeUndefined();
    expect(recognizeList([])).toBeUndefined();
    expect(recognizeList([undefined])).toBeUndefined();
  });

  it('ignora le righe senza settore nel conteggio', () => {
    expect(recognizeList([undefined, undefined, 'ADULTI'])).toEqual({ kind: 'recognized', list: 'ADULTI' });
  });
});

describe('listOfAdhesion (008, I1)', () => {
  it("elenco dall'import o dalla riconferma", async () => {
    const { listOfAdhesion } = await import('../src/index');
    expect(listOfAdhesion('2026-ACR', undefined)).toBe('ACR');
    expect(listOfAdhesion(undefined, 'GIOVANI')).toBe('GIOVANI');
    expect(listOfAdhesion('2026-ADULTI', 'ACR')).toBe('ADULTI');
    expect(listOfAdhesion(undefined, 'RAGAZZI')).toBeUndefined();
    expect(listOfAdhesion('boh', undefined)).toBeUndefined();
    expect(listOfAdhesion(undefined, undefined)).toBeUndefined();
  });
});
