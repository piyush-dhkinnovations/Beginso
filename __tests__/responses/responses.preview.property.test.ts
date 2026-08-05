/**
 * __tests__/responses/responses.preview.property.test.ts
 * Feature: sprint-4-responses, Property 3: Answer preview is always safe
 * Requirements: 2.2, 11.3
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { buildAnswerPreview } from '@/lib/formatters';
import type { ResponseAnswers } from '@/types/response';

describe('buildAnswerPreview — property test', () => {
  it('always returns a string of at most 60 chars, and never throws', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1 }),
          fc.oneof(fc.string(), fc.array(fc.string()), fc.integer(), fc.constant(null))
        ),
        (answers) => {
          const preview = buildAnswerPreview(answers as ResponseAnswers);
          return typeof preview === 'string' && preview.length <= 60;
        }
      ),
      { numRuns: 100 }
    );
  });
});
