/**
 * __tests__/analytics/dateRange.property.test.ts
 * Feature: sprint-5-analytics-reports, Property 1: Date range normalization never inverts
 * Validates: Requirement 3.4
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { normalizeDateRange } from '@/lib/dateRange';

describe('normalizeDateRange — property test', () => {
  it('always returns from <= to, and both are valid (never NaN/Invalid Date)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01'), noInvalidDate: true }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01'), noInvalidDate: true }),
        (a, b) => {
          const { from, to } = normalizeDateRange(a.toISOString(), b.toISOString());
          return (
            new Date(from) <= new Date(to) &&
            !Number.isNaN(new Date(from).getTime()) &&
            !Number.isNaN(new Date(to).getTime())
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
