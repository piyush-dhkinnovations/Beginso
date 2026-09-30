/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.1 / design.md §11.2, §13.
 * Workspace-defined pipeline stages replace the fixed `ResponseStatus` union. Backend contract to
 * confirm — field names are a proposal (design.md §11.2's own framing); the `category` enum is the
 * one part the backend has committed to (it is what keeps analytics/stat cards/report scope
 * meaningful once stage names are custom per workspace).
 */

export type StageCategory = 'new' | 'in_progress' | 'completed';

// Fixed palette of design-system badge tokens (ui/Badge's own variant set) — design.md §15/OQ-10:
// "a stored colour is a token name," never a raw hex from the backend. Reusing ui/Badge's existing
// variant union rather than inventing a parallel one keeps both themes correct for free (every one
// of these already has a dark override in beginso-ui.css).
export const STAGE_COLOR_TOKENS = ['primary', 'success', 'warning', 'error', 'info', 'neutral'] as const;
export type StageColorToken = (typeof STAGE_COLOR_TOKENS)[number];

export function isStageColorToken(value: unknown): value is StageColorToken {
  return typeof value === 'string' && (STAGE_COLOR_TOKENS as readonly string[]).includes(value);
}

/** Full stage record — GET /api/workspaces/:workspaceId/stages (design.md §11.2). */
export interface Stage {
  id: string;
  name: string;
  colour: StageColorToken;
  order: number;
  category: StageCategory;
  isDefault: boolean;
  /** Uncertain (design.md §13) — only present on the manager list, not every embed. */
  responseCount?: number;
}

/** The trimmed shape embedded on a response (`ResponseListItem.stage`, design.md §11.2). */
export interface StageRef {
  id: string;
  name: string;
  colour: StageColorToken;
  category: StageCategory;
}

// A response's stage was deleted, or stages haven't loaded yet for this workspace — every
// consumer must render a neutral chip, never throw (requirements.md §7.1, "unknown/deleted stage
// renders a neutral 'Unknown stage' chip; it never throws").
export const UNKNOWN_STAGE: StageRef = { id: '', name: 'Unknown stage', colour: 'neutral', category: 'new' };

export const CATEGORY_LABELS: Record<StageCategory, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// Bug fix, Sprint 12 close-out: OQ-9's resolution ("stages fixed to defaults" for the personal
// shell) was documented in `useStages`'s own comment but never actually built — the query was
// just disabled for `scope === 'personal'`, so a personal response's Stage select had zero
// options and rendered blank even though the response genuinely has a status. These mirror the
// backend's own default-stage seed (`stage.service.ts`'s DEFAULT_STAGES) exactly, so the ids line
// up with `StageCategory`/`status` one to one for the personal-shell write path.
export const PERSONAL_DEFAULT_STAGES: readonly StageRef[] = [
  { id: 'new', name: 'New', colour: 'neutral', category: 'new' },
  { id: 'in_progress', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  { id: 'completed', name: 'Completed', colour: 'success', category: 'completed' },
];
