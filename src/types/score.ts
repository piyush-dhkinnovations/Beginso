/**
 * Sprint 12 (inbox-collaboration), task 5.2/5.3 — OQ-7 resolved 3 Oct 2026 (requirements.md §B6.1,
 * design.md §11.2). Backend contract to confirm — field names are a proposal, same framing every
 * other new-infra type in this sprint uses (`Stage`, `Tag`). 1-10 fixed scale, no per-form config.
 */

/** Workspace-defined criterion — GET /api/workspaces/:workspaceId/score-criteria. */
export interface ScoreCriterion {
  id: string;
  workspaceId: string;
  label: string;
  order: number;
  /** Every workspace is seeded with one of these on first use (B6.1) — never deletable down to zero. */
  isDefault: boolean;
}

/** POST/PATCH /api/workspaces/:workspaceId/score-criteria[/:criterionId] body. */
export interface CriterionPayload {
  label: string;
}

/** The caller's own row for one criterion on one response. */
export interface ScoreEntry {
  criterionId: string;
  /** 1-10, fixed scale (B6.1). */
  value: number;
}

/**
 * GET /api/responses/:id/score — the caller's own per-criterion rows, plus the response-level
 * aggregate computed across every reviewer's rows (design.md §11.2). `scoreCount` is the reviewer
 * count shown alongside the average ("7.4 (3 reviewers)", B6.1), not a row count.
 */
export interface ResponseScore {
  responseId: string;
  entries: ScoreEntry[];
  scoreAverage: number | null;
  scoreCount: number;
}

/** PUT /api/responses/:id/score body — one row per call, upserts the caller's own row only. */
export interface ScorePayload {
  criterionId: string;
  value: number;
}

/** One row of GET /api/forms/:formId/score-comparison. */
export interface ScoreComparisonRow {
  responseId: string;
  reference?: string;
  scoreAverage: number | null;
  scoreCount: number;
}

export interface GetScoreComparisonParams {
  page?: number;
  sort?: 'scoreAverage' | '-scoreAverage';
}

export interface PaginatedScoreComparison {
  data: ScoreComparisonRow[];
  total: number;
  page: number;
  limit: number;
}
