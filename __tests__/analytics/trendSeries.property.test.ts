/**
 * Property: trend series mapping preserves shape
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { mapTrendSeries } from '@/components/analytics/TrendChart';

describe('mapTrendSeries — property test', () => {
  it('preserves length and order, and never emits NaN or a negative response count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ bucketStart: fc.date({ noInvalidDate: true }).map((d) => d.toISOString()), responses: fc.nat() })),
        (points) => {
          const mapped = mapTrendSeries(points);
          return (
            mapped.length === points.length &&
            mapped.every(
              (p, i) => p.bucketStart === points[i].bucketStart && p.responses >= 0 && !Number.isNaN(p.responses)
            )
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
