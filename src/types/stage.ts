/**
 * Workspace-defined pipeline stages replace the fixed `ResponseStatus` union. The `category` enum is what
 * keeps analytics, stat cards and report scope meaningful once stage names are custom per workspace.
 */

export type StageCategory = 'new' | 'in_progress' | 'completed';

// Fixed palette of design-system badge tokens (ui/Badge's own variant set):
// "a stored colour is a token name," never a raw hex from the backend. Reusing ui/Badge's existing
// variant union rather than inventing a parallel one keeps both themes correct for free (every one
// of these already has a dark override in beginso-ui.css).
export const STAGE_COLOR_TOKENS = ['primary', 'success', 'warning', 'error', 'info', 'neutral'] as const;
export type StageColorToken = (typeof STAGE_COLOR_TOKENS)[number];

export function isStageColorToken(value: unknown): value is StageColorToken {
  return typeof value === 'string' && (STAGE_COLOR_TOKENS as readonly string[]).includes(value);
}

/** Full stage record — GET /api/workspaces/:workspaceId/stages. */
export interface Stage {
  id: string;
  name: string;
  colour: StageColorToken;
  order: number;
  category: StageCategory;
  isDefault: boolean;
  /** Only present on the manager list, not every embed. */
  responseCount?: number;
}

/** The trimmed shape embedded on a response (`ResponseListItem.stage`). */
export interface StageRef {
  id: string;
  name: string;
  colour: StageColorToken;
  category: StageCategory;
}

export const CATEGORY_LABELS: Record<StageCategory, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
};

// Bug fix: "stages fixed to defaults" for the personal
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
