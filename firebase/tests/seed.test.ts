import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCHEDULE_2026_27, validateFeeSchedule } from '@tesseramento/fees';
import { describe, expect, it } from 'vitest';

/** SC-002 / F10: il JSON di seed coincide con il listino del PDF (una sola fonte dei valori). */
const SEED_PATH = fileURLToPath(new URL('../seed/fee-schedule-2026.json', import.meta.url));

describe('seed del listino 2026/27', () => {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));

  it('coincide con SCHEDULE_2026_27', () => {
    expect(seed).toEqual(JSON.parse(JSON.stringify(SCHEDULE_2026_27)));
  });

  it('è un listino valido', () => {
    expect(validateFeeSchedule(seed)).toEqual([]);
  });

  it('non contiene metadati dell’archivio (li aggiunge lo script)', () => {
    expect(seed).not.toHaveProperty('updatedAt');
    expect(seed).not.toHaveProperty('updatedBy');
  });
});
