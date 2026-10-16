/**
 * Shared TypeScript interfaces for Reports export.
 * Shapes match the backend contract in docs/backend-contract/api-reference.md §4, extended by
 * Sprint 12 (inbox-collaboration) design.md §11.2 (`POST /api/reports` — Extends) / §13: the
 * `status` scope becomes `stageId` (B2.3). `responseStatus`/the fixed union on `ReportJob` are
 * DEPRECATED — kept only so a saved report job created before this sprint still renders (design.md
 * §11.1, OQ-2's alias). New code reads `job.stage` (a name snapshot, requirements.md §7.3 #4).
 */

import type { StageCategory, StageColorToken } from './stage';
import type { ResponseFilters } from './response';

export type ReportFormat = 'csv' | 'pdf';
export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
};

/**
 * POST /api/reports (design.md §11.2 — Extends, task 2.7): "Accept the ResponseFilters object
 * (or ids[]) in place of the single status." `stageId`/`search`/`from`/`to` kept as individual
 * top-level fields for ReportsView's existing personal-shell callers (predates this sprint);
 * `filters`/`ids` are the new Inbox-driven shape (B2.3: "the export IS the list: same rows, same
 * permission scoping"). Backend contract to confirm.
 */
export interface CreateReportPayload {
  format: ReportFormat;
  formId?: string;
  stageId?: string;
  /** Response category to export (the backend's `status` filter). */
  status?: 'new' | 'in_progress' | 'completed';
  search?: string;
  from?: string;
  to?: string;
  /** The Inbox's active filter object — mutually exclusive with `ids`. */
  filters?: ResponseFilters;
  /** An explicit selection (bulk "Export" over a checked subset) — mutually exclusive with
   * `filters`. */
  ids?: string[];
}

export interface ReportJob {
  _id: string;
  format: ReportFormat;
  status: ReportStatus;
  formId?: string;
  formTitle?: string;      // denormalized for display; falls back to "All Forms" when absent with no formId
  /** Name snapshot of the stage this job was scoped to (design.md §11.2's "job row shows the stage
   * name snapshot") — Backend contract to confirm. Uncertain until BE 0.4 ships. */
  stage?: { id: string; name: string; colour: StageColorToken; category: StageCategory };
  /** @deprecated superseded by `stage` above — kept only for a report job created before this
   * sprint (OQ-2's deprecated-status alias). */
  responseStatus?: 'new' | 'in_progress' | 'completed';
  from?: string;            // ISO 8601
  to?: string;              // ISO 8601
  createdAt: string;       // ISO 8601
  completedAt?: string;    // ISO 8601
  expiresAt?: string;      // ISO 8601
  errorMessage?: string;   // safe, user-facing failure reason only
}

export interface GetReportsParams {
  page?: number;
  limit?: number;
}

export interface PaginatedReportsResult {
  data: ReportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
