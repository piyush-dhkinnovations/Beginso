/**
 * Shared TypeScript interfaces for Response Management (Sprint 4).
 * Matches the confirmed-live backend contract in docs/backend-contract/api-reference.md §3
 * (frozen 2026-08-05) — NOT the originally assumed shape design.md/requirements.md were
 * written against. Notably: `answers` is a flat label→value object (no fieldId/fieldType),
 * there is no `userAgent`, and `ipHash` is a top-level field, not nested under `metadata`.
 */

export type ResponseStatus = 'new' | 'in_progress' | 'completed';

export const STATUS_LABELS: Record<ResponseStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
};

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

export interface IResponse {
  _id: string;
  formId: string;
  answers: ResponseAnswers;
  status: ResponseStatus;
  ipHash?: string;            // SHA-256(rawIP), never the raw IP — absent when the backend
                               // couldn't resolve a client IP for this submission
  submittedAt: string;        // ISO 8601
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
}

export interface ResponseDetail extends IResponse {
  responseFiles: IResponseFile[];  // mapped from the wire's snake_case `response_files`
}

export interface GetResponsesParams {
  /** Omit to list responses across every form in the workspace (the "All Responses" view). */
  formId?: string;
  status?: ResponseStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponsesResult {
  data: IResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** GET /api/responses/stats — requested, not yet backend-confirmed (see api-reference.md §3). */
export interface ResponseStats {
  total: number;
  new: number;
  in_progress: number;
  completed: number;
}
