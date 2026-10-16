/**
 * __tests__/analytics/questionBreakdown.property.test.ts
 * Property: an option's percentage is its count over the people who answered, never forced to sum to 100.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { computeOptionPercentages } from '@/components/analytics/QuestionBreakdownChart';

describe('computeOptionPercentages - property test', () => {
  it('is always 0-100 and equals round(count / answered)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ option: fc.string(), count: fc.nat({ max: 1000 }) }), { minLength: 1 }),
        fc.integer({ min: 1, max: 1000 }),
        (options, answered) => {
          const capped = options.map((o) => ({ ...o, count: Math.min(o.count, answered) }));
          const withPct = computeOptionPercentages(capped, answered);
          return withPct.every((o, i) => o.percentage >= 0 && o.percentage <= 100 && o.percentage === Math.round((capped[i].count / answered) * 100));
        }
      ),
      { numRuns: 100 }
    );
  });
});
