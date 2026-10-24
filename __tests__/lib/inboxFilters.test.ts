/**
 * __tests__/lib/inboxFilters.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.1 (1.3), task 1.5.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  applyInboxFilterPatch,
  mapLegacyStatusToStageId,
  normalizeStageCategory,
  normalizeViewMode,
  parseInboxFiltersFromParams,
} from '@/lib/inboxFilters';
import type { StageRef } from '@/types/stage';

const STAGES: StageRef[] = [
  { id: 's1', name: 'Screening', colour: 'info', category: 'new' },
  { id: 's2', name: 'Interview', colour: 'warning', category: 'in_progress' },
  { id: 's3', name: 'Offer', colour: 'success', category: 'completed' },
];

describe('normalizeStageCategory', () => {
  it.each([
    ['new', 'new'],
    ['in_progress', 'in_progress'],
    ['completed', 'completed'],
    ['all', undefined],
    ['bogus', undefined],
    [null, undefined],
  ])('normalizes %s without trusting a cast', (raw, expected) => {
    expect(normalizeStageCategory(raw)).toBe(expected);
  });
});

describe('mapLegacyStatusToStageId — total over every input', () => {
  it('maps a known category to its workspace stage', () => {
    expect(mapLegacyStatusToStageId('in_progress', STAGES)).toBe('s2');
  });

  it('returns undefined for a category with no matching stage, never throws', () => {
    expect(mapLegacyStatusToStageId('new', [])).toBeUndefined();
  });

  it('property: never throws and only ever returns a stage id from the input, or undefined', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('new' as const, 'in_progress' as const, 'completed' as const),
        fc.array(fc.record({ id: fc.string(), name: fc.string(), colour: fc.constant('neutral' as const), category: fc.constantFrom('new' as const, 'in_progress' as const, 'completed' as const) })),
        (category, stages) => {
          const result = mapLegacyStatusToStageId(category, stages);
          return result === undefined || stages.some((s) => s.id === result && s.category === category);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('parseInboxFiltersFromParams — legacy status held until stages load', () => {
  it('holds a legacy status param (not dropped) when stages have not loaded', () => {
    const params = new URLSearchParams('status=in_progress');
    const { filters, legacyStatusPending } = parseInboxFiltersFromParams(params, undefined);
    expect(filters.stageId).toBeUndefined();
    expect(legacyStatusPending).toBe('in_progress');
  });

  it('resolves a legacy status param once stages are available', () => {
    const params = new URLSearchParams('status=completed');
    const { filters, legacyStatusPending } = parseInboxFiltersFromParams(params, STAGES);
    expect(filters.stageId).toBe('s3');
    expect(legacyStatusPending).toBeUndefined();
  });

  it('an explicit stage= param wins over a legacy status= param', () => {
    const params = new URLSearchParams('status=new&stage=s2');
    const { filters } = parseInboxFiltersFromParams(params, STAGES);
    expect(filters.stageId).toBe('s2');
  });

  it('drops an unknown stage id once stages have loaded, without throwing', () => {
    const params = new URLSearchParams('stage=does-not-exist');
    const { filters } = parseInboxFiltersFromParams(params, STAGES);
    expect(filters.stageId).toBeUndefined();
  });

  it('parses tags/assignee/unread/duplicate/date-range/search', () => {
    const params = new URLSearchParams('tags=a,b&assignee=me&unread=1&duplicate=1&from=2026-01-01&to=2026-01-31&q=alice');
    const { filters } = parseInboxFiltersFromParams(params, STAGES);
    expect(filters).toMatchObject({
      tagIds: ['a', 'b'],
      assigneeId: 'me',
      unread: true,
      duplicate: true,
      from: '2026-01-01',
      to: '2026-01-31',
      q: 'alice',
    });
  });
});

describe('applyInboxFilterPatch', () => {
  it('setting a stage clears any legacy status param', () => {
    const current = new URLSearchParams('status=new');
    const next = applyInboxFilterPatch(current, { stageId: 's2' });
    expect(next.get('stage')).toBe('s2');
    expect(next.has('status')).toBe(false);
  });

  it('clearing a filter (undefined) removes its param', () => {
    const current = new URLSearchParams('assignee=me');
    const next = applyInboxFilterPatch(current, { assigneeId: undefined });
    expect(next.has('assignee')).toBe(false);
  });
});

describe('applyInboxFilterPatch: the view a form opens in', () => {
  it('writes no view for the default view, whichever it is', () => {
    expect(applyInboxFilterPatch(new URLSearchParams(), { view: 'table' }).has('view')).toBe(false);
    expect(applyInboxFilterPatch(new URLSearchParams(), { view: 'board' }, 'board').has('view')).toBe(false);
  });

  it('writes the view when it is not the default, so a form that opens as Board can still be switched to Table', () => {
    expect(applyInboxFilterPatch(new URLSearchParams(), { view: 'board' }).get('view')).toBe('board');
    expect(applyInboxFilterPatch(new URLSearchParams(), { view: 'table' }, 'board').get('view')).toBe('table');
    expect(applyInboxFilterPatch(new URLSearchParams('view=table'), { view: 'board' }, 'board').has('view')).toBe(false);
  });
});

describe('normalizeViewMode', () => {
  it.each([
    ['board', 'board'],
    ['calendar', 'calendar'],
    ['chart', 'table'],
    ['table', 'table'],
    ['bogus', 'table'],
    [null, 'table'],
  ])('normalizes %s to %s', (raw, expected) => {
    expect(normalizeViewMode(raw)).toBe(expected);
  });
});
