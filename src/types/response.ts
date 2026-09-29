/**
 * Shared TypeScript interfaces for Response Management.
 * Sprint 12 (inbox-collaboration), requirements.md §7.1/§13, design.md §11.2/§13:
 * `ResponseStatus`/`STATUS_LABELS` are REMOVED — a response now carries a workspace-defined
 * `stage` (see `types/stage.ts`). `status` survives only as an optional, deprecated field the
 * backend derives from `stage.category` during the deprecation window (design.md §11.1,
 * OQ-2) — new code must not read it. Backend contract to confirm throughout (design.md §11.2);
 * uncertain fields are flagged per design.md §13.
 */

import type { Stage, StageCategory, StageRef } from './stage';

export type AnswerValue = string | string[] | number | null;

/** Keyed by field label — the backend does not send fieldId/fieldType per answer. */
export type ResponseAnswers = Record<string, AnswerValue>;

export interface IResponseFile {
  id: string;
  name: string;
  size: number;             // bytes
  type: string;             // MIME type
  url: string;               // untrusted backend locator; private files use the same-origin proxy
  uploadTime: string;        // ISO 8601
}

export interface ResponseAssignee {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Uncertain (design.md §13) — set when the assignee's membership has been removed (F16/B3.3);
   * the name is kept, never blanked (requirements.md §7.8). */
  removed?: boolean;
}

export interface ResponseTag {
  id: string;
  name: string;
  colour: string;
}

export interface IResponse {
  _id: string;
  formId: string;
  /** Immutable per-form human reference, e.g. "#142" (B8.1). Backend contract to confirm — until
   * BE 0.3 ships and back-fills existing responses this may be absent; render `shortId(_id)` as a
   * fallback (kept in `lib/formatters.ts`), never a blank. */
  reference?: string;
  answers: ResponseAnswers;
  stage: StageRef;
  /** @deprecated Derived from `stage.category` by the backend during the migration window
   * (design.md §11.1, OQ-2). Do not read in new code — use `stage.category` instead. Kept only so
   * an unmigrated caller (a saved report scope, a cached bundle) degrades instead of breaking. */
  status?: StageCategory;
  assignee: ResponseAssignee | null;
  tags: ResponseTag[];
  /** Uncertain (design.md §13) — defaults assumed 0 until BE 0.3/0.2 ship. */
  noteCount?: number;
  attachmentCount?: number;
  /** Per-caller read state (B8.2). Uncertain until BE 0.2 ships — treat an absent value as read
   * (matches the migration's own "existing = read" default, OQ-4) rather than falsely unread. */
  unread?: boolean;
  duplicateOfId?: string | null;
  /** Uncertain (design.md §13) — cuttable (B6, requirements.md §7.10). */
  score?: { average: number; count: number } | null;
  ipHash?: string;            // SHA-256(rawIP), never the raw IP — absent when the backend
                               // couldn't resolve a client IP for this submission
  submittedAt: string;        // ISO 8601
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

export interface ResponseDetail extends IResponse {
  responseFiles: IResponseFile[];  // mapped from the wire's snake_case `response_files`
}

/** URL/query filter shape shared by the list call and saved views (design.md §11.2/§13). */
export interface ResponseFilters {
  stageId?: string;
  tagIds?: string[];
  /** A membership id, or the literal 'unassigned' / 'me' (resolved server-side). */
  assigneeId?: string;
  unread?: boolean;
  duplicate?: boolean;
  from?: string;
  to?: string;
  q?: string;
}

export interface GetResponsesParams extends ResponseFilters {
  /** Omit to list responses across every form in the workspace (the "All Responses" view). */
  formId?: string;
  sort?: string;
  page?: number;
  limit?: number;
  /** @deprecated legacy search param, superseded by `q` — kept only while callers migrate. */
  search?: string;
}

export interface PaginatedResponsesResult {
  data: IResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** GET /api/responses/stats (design.md §11.2 — extends the already-live endpoint). */
export interface ResponseStats {
  total: number;
  unread: number;
  byStage: { stageId: string; name: string; category: StageCategory; count: number }[];
  byCategory: Record<StageCategory, number>;
}

/**
 * POST /api/responses/bulk (design.md §11.2, task 2.2). Backend contract to confirm — field
 * names are a proposal. `target` is `{ids}` for an explicit selection or `{filter}` for "Select
 * all N matching" (requirements.md §7.2 (2.2): sent as a filter, never as N ids).
 */
export type BulkTarget = { ids: string[] } | { filter: ResponseFilters; formId?: string };

export type BulkAction =
  | { type: 'stage'; stageId: string }
  | { type: 'assign'; assigneeId: string | null }
  | { type: 'tag'; tagId: string }
  | { type: 'untag'; tagId: string }
  | { type: 'read' }
  | { type: 'unread' }
  | { type: 'delete' }
  | { type: 'restore' };

/** Snapshot of one response's prior values, returned by a bulk mutation so `restore` can undo it
 * with a single follow-up request (design.md §8 "Bulk"). Only `restore` sends `previous` back. */
export interface BulkPrevious {
  id: string;
  stageId?: string;
  assigneeId?: string | null;
  tagIds?: string[];
  read?: boolean;
  deleted?: boolean;
}

export interface BulkRequest {
  target: BulkTarget;
  action: BulkAction;
  /** Only present for a `restore` action — the `previous` snapshot from the bulk call being
   * undone. */
  previous?: BulkPrevious[];
}

export interface BulkResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
  previous: BulkPrevious[];
}

// Re-exported for callers that only need the stage shape alongside response types.
export type { Stage, StageCategory, StageRef };
