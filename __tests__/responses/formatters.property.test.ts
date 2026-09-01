/**
 * __tests__/responses/formatters.property.test.ts
 * Feature: sprint-4-responses, Property 4: formatFileSize always returns a positive string
 * Requirements: 6.2, 10.1, 11.4
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { formatFileSize, detectRespondentIdentity } from '@/lib/formatters';
import type { ResponseAnswers } from '@/types/response';

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

describe('detectRespondentIdentity — property test', () => {
  it('never throws, and email (when present) always matches an email shape', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1 }),
          fc.oneof(fc.string(), fc.array(fc.string()), fc.integer(), fc.constant(null))
        ),
        (answers) => {
          const identity = detectRespondentIdentity(answers as ResponseAnswers);
          const emailShapeOk = identity.email === undefined || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(identity.email);
          const labelNotEmail = identity.label === undefined || identity.label !== identity.email;
          return emailShapeOk && labelNotEmail;
        }
      ),
      { numRuns: 100 }
    );
  });
});
