/**
 * __tests__/lib/reportExport.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.9/B2.3, task 2.7.
 * "The export request in the test equals the list request's filter" (tasks.md 2.7's own Done
 * line) — this proves the equivalence directly, without mounting ResponsesHubView/ReportsView.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import type { GetResponsesParams, ResponseFilters } from '@/types/response';

const filtersArb = fc.record(
  {
    stageId: fc.option(fc.string(), { nil: undefined }),
    tagIds: fc.option(fc.array(fc.string()), { nil: undefined }),
    assigneeId: fc.option(fc.string(), { nil: undefined }),
    unread: fc.option(fc.boolean(), { nil: undefined }),
    duplicate: fc.option(fc.boolean(), { nil: undefined }),
    from: fc.option(fc.string(), { nil: undefined }),
    to: fc.option(fc.string(), { nil: undefined }),
    q: fc.option(fc.string(), { nil: undefined }),
  },
  { requiredKeys: [] }
);

describe('exportPayloadFromFilters — equals the list request', () => {
  it('property: the export payload carries exactly the filters the list query used', () => {
    fc.assert(
      fc.property(filtersArb, fc.option(fc.string(), { nil: undefined }), (filters, formId) => {
        // The same filters object the list view passes into getResponses(), spread into
        // GetResponsesParams (formId/page/limit/sort are list-only concerns, not filter fields).
        const listParams: GetResponsesParams = { formId, ...filters, page: 1, limit: 50 };
        const { page: _page, limit: _limit, formId: _formId, ...listFilters } = listParams;
        void _page; void _limit; void _formId;

        const exportPayload = exportPayloadFromFilters('csv', formId, filters as ResponseFilters);

        return (
          exportPayload.formId === formId &&
          JSON.stringify(exportPayload.filters) === JSON.stringify(listFilters)
        );
      }),
      { numRuns: 100 }
    );
  });

  it('example: search + stage + unread filter round-trips unchanged', () => {
    const filters: ResponseFilters = { stageId: 's1', unread: true, q: 'alice' };
    expect(exportPayloadFromFilters('pdf', 'form-1', filters)).toEqual({
      format: 'pdf',
      formId: 'form-1',
      filters,
    });
  });
});

describe('exportPayloadFromTarget', () => {
  it('an explicit id-list target exports exactly those ids, no filter', () => {
    const result = exportPayloadFromTarget('csv', { ids: ['r1', 'r2'] });
    expect(result).toEqual({ format: 'csv', ids: ['r1', 'r2'] });
  });

  it('a filter target ("Select all N matching") exports the filter, not ids', () => {
    const filter: ResponseFilters = { stageId: 's2' };
    const result = exportPayloadFromTarget('csv', { filter, formId: 'form-1' });
    expect(result).toEqual({ format: 'csv', formId: 'form-1', filters: filter });
    expect(result).not.toHaveProperty('ids');
  });
});
