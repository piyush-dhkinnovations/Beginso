/**
 * Shared TypeScript interfaces for Response Management.
 * A response carries a workspace-defined
 * `stage` (see `types/stage.ts`). `status` survives only as an optional, deprecated field the
 * backend derives from `stage.category` during the deprecation window
 * — new code must not read it.
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

/** GET /api/responses/link-preview — metadata for a URL a respondent submitted. Only `url` and `domain` are guaranteed. */
export interface LinkPreview {
  url: string;
  domain: string;
  title?: string;
  siteName?: string;
  /** https thumbnail (og:image), if the site published one. */
  image?: string;
}

export interface ResponseAssignee {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Not built yet in the backend (removing a member unassigns their responses instead). When set,
   * the name is kept, never blanked. */
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
  /** Immutable human reference given at submission. It may be absent on old data:
   * render `shortId(_id)` as a
   * fallback (kept in `lib/formatters.ts`), never a blank. */
  reference?: string;
  answers: ResponseAnswers;
  /** Who submitted: the account email on a signed-in-only form, the address given on a tracked form, null on an open one. */
  respondentEmail?: string | null;
  /** Null for a response with no `stageId` yet (unmigrated real data — the stage migration has
   * not been run against production). `StageBadge` already renders this as "Unknown stage"; any
   * new consumer of `.stage` must not assume it is present (real crash found in manual QA when
   * `BoardCard` read `.stage.id` directly). */
  stage: StageRef | null;
  /** @deprecated Derived from `stage.category` by the backend during the migration window.
   * Do not read in new code — use `stage.category` instead. Kept only so
   * an unmigrated caller (a saved report scope, a cached bundle) degrades instead of breaking. */
  status?: StageCategory;
  assignee: ResponseAssignee | null;
  /** Undefined on data from before tags existed — treat as empty, never assume present. */
  tags?: ResponseTag[];
  /** Absent = 0. `attachmentCount` is not built yet in the backend. */
  noteCount?: number;
  attachmentCount?: number;
  /** Per-caller read state. Treat an absent value as read
   * (matches the migration's own "existing = read" default) rather than falsely unread. */
  unread?: boolean;
  duplicateOfId?: string | null;
  /** Absent = not a test submission. */
  isTest?: boolean;
  /** Set when the respondent edited after review. */
  editedAfterReviewAt?: string | null;
  /** The last time the respondent changed their own answers (any edit). Absent/null = never edited. */
  lastEditedByRespondentAt?: string | null;
  /** Not built yet in the backend: it sends `scoreAverage` and `scoreCount` instead. */
  score?: { average: number; count: number } | null;
  /** What the list endpoint sends for the "Average score" column (null/absent = not scored). */
  scoreAverage?: number | null;
  scoreCount?: number;
  ipHash?: string;            // SHA-256(rawIP), never the raw IP — absent when the backend
                               // couldn't resolve a client IP for this submission
  submittedAt: string;        // ISO 8601
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

export interface ResponseDetail extends IResponse {
  responseFiles: IResponseFile[];  // mapped from the wire's snake_case `response_files`
}

/** URL/query filter shape shared by the list call and saved views. */
export interface ResponseFilters {
  stageId?: string;
  tagIds?: string[];
  /** A membership id, or the literal 'unassigned' / 'me' (resolved server-side). */
  assigneeId?: string;
  unread?: boolean;
  duplicate?: boolean;
  /** Include test submissions. Off by default — tests never count anywhere. */
  includeTest?: boolean;
  from?: string;
  to?: string;
  q?: string;
  /** Chart drill-down: responses whose answer to field `field` equals `value` (omitted value = "answered
   * this field"). For a date field `value` is a bucket ("2026-09-30", "2026-W40", "2026-09") and
   * `granularity` ("day"|"week"|"month") says which. The SERVER filters and paginates. */
  field?: string;
  value?: string;
  granularity?: 'day' | 'week' | 'month';
  /** A chart builder chart and, optionally, one of its groups, as JSON (lib/chartBuilder.ts serialiseChartFilter). Needs `formId`. */
  chart?: string;
}

export interface GetResponsesParams extends ResponseFilters {
  /** Omit to list responses across every form in the workspace (the "All Responses" view). */
  formId?: string;
  /** Category filter (new | in_progress | completed). Sent for personal-shell stages, which have no Stage ids. */
  status?: 'new' | 'in_progress' | 'completed';
  sort?: string;
  /** A column to sort by instead of the submission time: `email`, or `q:<fieldId>` for one question's answer (needs `formId`). `order` is its direction. */
  sortBy?: string;
  /** Submission order across ALL pages: 'asc' = oldest first. Omitted = newest first (the API default). */
  order?: 'asc' | 'desc';
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

/** GET /api/responses/stats. */
export interface ResponseStats {
  total: number;
  unread: number;
  byStage: { stageId: string; name: string; category: StageCategory; count: number }[];
  byCategory: Record<StageCategory, number>;
}

/**
 * POST /api/responses/bulk.
 * `target` is `{ids}` for an explicit selection or `{filter}` for "Select
 * all N matching" (sent as a filter, never as N ids).
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
 * with a single follow-up request. Only `restore` sends `previous` back. */
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
