/**
 * __tests__/responses/formatters.property.test.ts
 * Feature: sprint-4-responses, Property 4: formatFileSize always returns a positive string
 * Requirements: 6.2, 10.1, 11.4
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { formatFileSize } from '@/lib/formatters';

describe('formatFileSize — property test', () => {
  it('never returns an empty string, a negative-looking string, NaN, or Infinity', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000_000 }), (bytes) => {
        const result = formatFileSize(bytes);
        return (
          result.length > 0 &&
          !result.startsWith('-') &&
          !result.includes('NaN') &&
          !result.includes('Infinity')
        );
      }),
      { numRuns: 100 }
    );
  });
});
