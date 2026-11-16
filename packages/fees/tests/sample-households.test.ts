import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import { SAMPLE_HOUSEHOLDS } from './fixtures/sample-households';

describe('sample households', () => {
  it.each(SAMPLE_HOUSEHOLDS.map((h) => [h.name, h] as const))('%s', (_name, household) => {
    const r = calculateHouseholdFee({
      associationYear: 2026,
      schedule: SCHEDULE_2026_27,
      members: household.members,
    });
    if ('totalCents' in household.expected) {
      expect(r.status).toBe('calculated');
      if (r.status === 'calculated') expect(r.totalCents).toBe(household.expected.totalCents);
    } else {
      expect(r.status).toBe('notCovered');
      if (r.status === 'notCovered') {
        expect(r.reasons).toEqual([household.expected.notCovered]);
      }
    }
  });

  it('SC-003: sono notCovered solo il nucleo da 6 e la bambina del 2022', () => {
    const notCovered = SAMPLE_HOUSEHOLDS.filter(
      (h) =>
        calculateHouseholdFee({
          associationYear: 2026,
          schedule: SCHEDULE_2026_27,
          members: h.members,
        }).status === 'notCovered',
    ).map((h) => h.name);
    expect(notCovered).toEqual(['nucleo 900004 (6 persone)', 'singola 2022 (sotto i 6 anni)']);
  });
});
