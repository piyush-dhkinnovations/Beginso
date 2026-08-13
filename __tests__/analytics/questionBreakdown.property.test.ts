/**
 * __tests__/analytics/questionBreakdown.property.test.ts
 * Feature: sprint-5-analytics-reports, Property 3: Question percentages sum to ~100
 * Validates: Requirement 6.3
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { computeOptionPercentages } from '@/components/analytics/QuestionBreakdownChart';

describe('computeOptionPercentages — property test', () => {
  it('returns non-negative percentages summing to 100 within a ±1 tolerance', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ option: fc.string(), count: fc.nat({ max: 1000 }) }), { minLength: 1 }),
        (options) => {
          if (options.every((o) => o.count === 0)) return true; // degenerate all-zero case handled separately
          const withPct = computeOptionPercentages(options);
          const sum = withPct.reduce((s, o) => s + o.percentage, 0);
          return withPct.every((o) => o.percentage >= 0) && Math.abs(sum - 100) <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
