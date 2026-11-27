/**
 * Property: date range normalization never inverts
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
