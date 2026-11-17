import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27, type FeeSchedule } from '../src/index';
import { EXAMPLES } from './fixtures/examples';

/** P7 / SC-005: il listino serializzato come in archivio (senza updatedAt/updatedBy) dà gli stessi totali. */
const stored: FeeSchedule = JSON.parse(JSON.stringify(SCHEDULE_2026_27));

describe('listino riletto dall’archivio', () => {
  it('è uguale al listino nel codice', () => {
    expect(stored).toEqual(SCHEDULE_2026_27);
  });

  it.each(EXAMPLES.map((e) => [e.caseNumber, e.description, e] as const))(
    'caso %i: %s',
    (_n, _d, example) => {
      const result = calculateHouseholdFee({
        associationYear: 2026,
        schedule: stored,
        members: example.members,
      });
      expect(result.status).toBe('calculated');
      if (result.status === 'calculated') {
        expect(result.totalCents).toBe(example.expectedTotalCents);
      }
    },
  );
});
