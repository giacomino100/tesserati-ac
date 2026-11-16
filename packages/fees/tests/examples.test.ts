import { describe, expect, it } from 'vitest';
import { calculateHouseholdFee, SCHEDULE_2026_27 } from '../src/index';
import { EXAMPLES } from './fixtures/examples';

describe('examples', () => {
  it.each(EXAMPLES.map((e) => [e.caseNumber, e.description, e] as const))(
    'caso %i: %s',
    (_n, _description, example) => {
      const result = calculateHouseholdFee({
        associationYear: 2026,
        schedule: SCHEDULE_2026_27,
        members: example.members,
      });
      expect(result.status).toBe('calculated');
      if (result.status === 'calculated') {
        expect(result.totalCents).toBe(example.expectedTotalCents);
      }
    },
  );
});
