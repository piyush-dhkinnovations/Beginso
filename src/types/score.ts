/**
 * 1-10 fixed scale, no per-form config.
 */

/** Workspace-defined criterion — GET /api/workspaces/:workspaceId/score-criteria. */
export interface ScoreCriterion {
  id: string;
  workspaceId: string;
  label: string;
  order: number;
  /** Every workspace is seeded with one of these on first use — never deletable down to zero. */
  isDefault: boolean;
}

/** POST/PATCH /api/workspaces/:workspaceId/score-criteria[/:criterionId] body. */
export interface CriterionPayload {
  label: string;
}

/** The caller's own row for one criterion on one response. */
export interface ScoreEntry {
  criterionId: string;
  /** 1-10, fixed scale. */
  value: number;
}

/**
 * GET /api/responses/:id/score — the caller's own per-criterion rows, plus the response-level
 * aggregate computed across every reviewer's rows. `scoreCount` is the reviewer
 * count shown alongside the average ("7.4 (3 reviewers)"), not a row count.
 */
export interface ResponseScore {
  responseId: string;
  /** Undefined when the response has no scores yet — treat as empty, never assume present. */
  entries?: ScoreEntry[];
  scoreAverage: number | null;
  scoreCount: number;
}

/** PUT /api/responses/:id/score body — one row per call, upserts the caller's own row only. */
export interface ScorePayload {
  criterionId: string;
  value: number;
}
