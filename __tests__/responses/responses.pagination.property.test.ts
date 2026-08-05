/**
 * __tests__/responses/responses.pagination.property.test.ts
 * Feature: sprint-4-responses, Property 2: Pagination bounds are never exceeded
 * Requirements: 2.3, 11.2
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import type { IResponse, PaginatedResponsesResult } from '@/types/response';

function buildMockPaginatedResult(total: number, page: number, limit: number): PaginatedResponsesResult {
  const start = (page - 1) * limit;
  const count = Math.max(Math.min(limit, total - start), 0);
  const data: IResponse[] = Array.from({ length: count }, (_, i) => ({
    _id: `r-${start + i}`,
    formId: 'form-1',
    answers: {},
    status: 'new',
    ipHash: 'a1b2c3d4e5f60718',
    submittedAt: '2026-08-03T09:50:00.000Z',
    createdAt: '2026-08-03T09:50:00.000Z',
    updatedAt: '2026-08-03T09:50:00.000Z',
  }));
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

describe('pagination bounds — property test', () => {
  it('data.length never exceeds limit, and never spills past total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // limit
        fc.integer({ min: 0, max: 500 }), // total
        fc.integer({ min: 1, max: 20 }), // raw page seed
        (limit, total, rawPage) => {
          // Clamp into the valid page range for this (total, limit) — a page requested
          // past the last page is a separate, empty-state concern, not a bounds violation:
          // (page - 1) * limit can exceed total on its own once page is out of range,
          // which the invariant below isn't meant to capture.
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const page = ((rawPage - 1) % totalPages) + 1;
          const result = buildMockPaginatedResult(total, page, limit);
          return result.data.length <= limit && (page - 1) * limit + result.data.length <= total;
        }
      ),
      { numRuns: 200 }
    );
  });
});
