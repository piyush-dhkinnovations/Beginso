/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.1 (1.3) / §7.2 (2.2), design.md §7/§8/§21.
 * Pure URL ⇄ `ResponseFilters` helpers — no React, no `next/navigation`, so they're trivial to
 * property-test (design.md §21: "legacy-status mapping total").
 */
import type { ResponseFilters } from '@/types/response';
import type { StageCategory, StageRef } from '@/types/stage';

export type InboxViewMode = 'table' | 'board' | 'calendar';
const VIEW_MODES = new Set<InboxViewMode>(['table', 'board', 'calendar']);

export function normalizeViewMode(raw: string | null): InboxViewMode {
  return raw && VIEW_MODES.has(raw as InboxViewMode) ? (raw as InboxViewMode) : 'table';
}

export function normalizeGranularity(raw: string | null): 'day' | 'week' | 'month' | undefined {
  return raw === 'day' || raw === 'week' || raw === 'month' ? raw : undefined;
}

const STAGE_CATEGORIES = new Set<StageCategory>(['new', 'in_progress', 'completed']);

export function normalizeStageCategory(raw: string | null): StageCategory | undefined {
  return raw && STAGE_CATEGORIES.has(raw as StageCategory) ? (raw as StageCategory) : undefined;
}

/**
 * Requirements.md §7.1 (1.3): "A legacy `?status=in_progress` link ... is mapped to the workspace's
 * stage of that category, not dropped." Picks the lowest-`order` stage of the matching category —
 * total over every input (a category with no matching stage yet, or no stages loaded, returns
 * undefined rather than throwing), which is what makes the fast-check property in
 * `inboxFilters.test.ts` provable.
 */
export function mapLegacyStatusToStageId(category: StageCategory, stages: readonly StageRef[]): string | undefined {
  const candidates = stages.filter((s) => s.category === category);
  return candidates.length > 0 ? candidates[0].id : undefined;
}

export interface ParsedInboxFilters {
  filters: ResponseFilters;
  /** True when a legacy `?status=` param is present but could not be resolved yet because the
   * stage list hasn't loaded — the caller must hold the param, not drop it (requirements.md §7.1). */
  legacyStatusPending: StageCategory | undefined;
}

/**
 * `stages` is `undefined` while the stage list is still loading (as opposed to `[]`, a workspace
 * with zero stages, which cannot actually happen per B1.1's "always returns ≥ 1 stage" — but this
 * function treats both the same: no resolution possible yet without throwing).
 */
export function parseInboxFiltersFromParams(
  params: URLSearchParams,
  stages: readonly StageRef[] | undefined
): ParsedInboxFilters {
  const stageIdParam = params.get('stage') ?? undefined;
  const legacyStatus = normalizeStageCategory(params.get('status'));

  let stageId = stageIdParam;
  let legacyStatusPending: StageCategory | undefined;

  if (!stageId && legacyStatus) {
    if (stages) {
      const mapped = mapLegacyStatusToStageId(legacyStatus, stages);
      if (mapped) stageId = mapped;
    } else {
      legacyStatusPending = legacyStatus;
    }
  }

  // Unknown stage id (a saved link/view referencing a deleted stage): dropped from the filter
  // object once stages have loaded, but the caller still shows "1 filter no longer exists"
  // (requirements.md §7.6) — this function only reports the resolvable value.
  if (stageId && stages && !stages.some((s) => s.id === stageId)) {
    stageId = undefined;
  }

  const tagIdsParam = params.get('tags');
  const filters: ResponseFilters = {
    stageId,
    tagIds: tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : undefined,
    assigneeId: params.get('assignee') ?? undefined,
    unread: params.get('unread') === '1' ? true : undefined,
    duplicate: params.get('duplicate') === '1' ? true : undefined,
    includeTest: params.get('tests') === '1' ? true : undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    q: params.get('q') ?? params.get('search') ?? undefined,
    // Chart drill-down links (?field=<fieldId>&value=<answer or date bucket>&granularity=).
    field: params.get('field') ?? undefined,
    value: params.get('value') ?? undefined,
    granularity: normalizeGranularity(params.get('granularity')),
  };

  return { filters, legacyStatusPending };
}

/** Applies a filter patch onto an existing URLSearchParams, deleting keys whose value is
 * undefined/empty and always dropping the legacy `status` key once a `stage` is set (2.2's
 * "filter state lives in the URL"). Returns a new URLSearchParams; does not mutate the input. */
export function applyInboxFilterPatch(
  current: URLSearchParams,
  patch: Partial<ResponseFilters & { page: number; view: InboxViewMode; search: string }>,
  // The view the page opens in when the address names none (a form can open as Board or Calendar). Only a view other than this one is written.
  defaultView: InboxViewMode = 'table'
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  const set = (key: string, value: string | undefined | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };

  if ('stageId' in patch) {
    set('stage', patch.stageId);
    next.delete('status'); // an explicit stage filter always supersedes the legacy param
  }
  if ('tagIds' in patch) set('tags', patch.tagIds?.length ? patch.tagIds.join(',') : undefined);
  if ('assigneeId' in patch) set('assignee', patch.assigneeId);
  if ('unread' in patch) set('unread', patch.unread ? '1' : undefined);
  if ('duplicate' in patch) set('duplicate', patch.duplicate ? '1' : undefined);
  if ('includeTest' in patch) set('tests', patch.includeTest ? '1' : undefined);
  if ('from' in patch) set('from', patch.from);
  if ('to' in patch) set('to', patch.to);
  if ('q' in patch) set('q', patch.q);
  if ('field' in patch) set('field', patch.field);
  if ('value' in patch) set('value', patch.value);
  if ('granularity' in patch) set('granularity', patch.granularity);
  if ('search' in patch) set('search', patch.search);
  if ('page' in patch) set('page', patch.page ? String(patch.page) : undefined);
  if ('view' in patch) set('view', patch.view && patch.view !== defaultView ? patch.view : undefined);

  return next;
}
