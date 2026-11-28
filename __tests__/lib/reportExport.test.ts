/**
 * The export request carries the list's filters in the shape POST /api/reports reads: this
 * proves it directly, without mounting ResponsesHubView/ReportsView.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import type { ResponseFilters } from '@/types/response';

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
    chart: fc.option(fc.string(), { nil: undefined }),
    includeTest: fc.option(fc.boolean(), { nil: undefined }),
  },
  { requiredKeys: [] }
);

describe('exportPayloadFromFilters — equals the list request', () => {
  it('property: every filter the list used is a top-level field the backend reads (search text as `search`)', () => {
    fc.assert(
      fc.property(filtersArb, fc.option(fc.string(), { nil: undefined }), (filters, formId) => {
        const payload = exportPayloadFromFilters('csv', formId, filters as ResponseFilters);
        const { q, ...rest } = filters;
        expect(payload).toEqual({ format: 'csv', formId, ...rest, search: q });
        expect(payload).not.toHaveProperty('filters');
      }),
      { numRuns: 100 }
    );
  });

  // The backend drops keys it does not know, so a nested `filters` object exported every response of the form.
  it('example: search + stage + unread reach the backend', () => {
    const filters: ResponseFilters = { stageId: 's1', unread: true, q: 'alice' };
    expect(exportPayloadFromFilters('pdf', 'form-1', filters)).toEqual({ format: 'pdf', formId: 'form-1', stageId: 's1', unread: true, search: 'alice' });
  });

  it('a chart drill-through and test responses are exported as the list shows them', () => {
    const filters: ResponseFilters = { chart: '{"definition":{}}', includeTest: true };
    expect(exportPayloadFromFilters('csv', 'form-1', filters)).toEqual({ format: 'csv', formId: 'form-1', ...filters });
    expect(exportPayloadFromTarget('csv', { formId: 'form-1', filter: filters })).toEqual({ format: 'csv', formId: 'form-1', ...filters });
  });

  it('a personal stage is a fixed category, which the backend filters as `status`', () => {
    const payload = exportPayloadFromFilters('csv', 'form-1', { stageId: 'in_progress' });
    expect(payload).toEqual({ format: 'csv', formId: 'form-1', status: 'in_progress' });
    expect(payload.stageId).toBeUndefined();
  });
});

describe('exportPayloadFromTarget', () => {
  it('an explicit id-list target exports exactly those ids, no filter', () => {
    const result = exportPayloadFromTarget('csv', { ids: ['r1', 'r2'] });
    expect(result).toEqual({ format: 'csv', ids: ['r1', 'r2'] });
  });

  it('a filter target ("Select all N matching") exports the filter, not ids', () => {
    const result = exportPayloadFromTarget('csv', { filter: { stageId: 's2' }, formId: 'form-1' });
    expect(result).toEqual({ format: 'csv', formId: 'form-1', stageId: 's2' });
    expect(result).not.toHaveProperty('ids');
  });
});
