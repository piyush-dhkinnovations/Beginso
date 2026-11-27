/**
 * Shared TypeScript interfaces for Reports export.
 * Shapes match the backend contract in docs/backend-contract/api-reference.md §4. The
 * `status` scope becomes `stageId`. `responseStatus`/the fixed union on `ReportJob` are
 * DEPRECATED — kept only so an older saved report job still renders.
 * New code reads `job.stage` (a name snapshot).
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
 * POST /api/reports. The backend reads every filter at the top level and ignores keys it does not know; the search text
 * is `search`. `ids` (an explicit selection) takes the place of the filters.
 */
export interface CreateReportPayload
  extends Pick<ResponseFilters, 'tagIds' | 'assigneeId' | 'unread' | 'duplicate' | 'field' | 'value' | 'granularity'> {
  format: ReportFormat;
  formId?: string;
  stageId?: string;
  /** Response category to export (the backend's `status` filter). */
  status?: 'new' | 'in_progress' | 'completed';
  search?: string;
  from?: string;
  to?: string;
  /** An explicit selection (bulk "Export" over a checked subset). */
  ids?: string[];
}

export interface ReportJob {
  _id: string;
  format: ReportFormat;
  status: ReportStatus;
  formId?: string;
  formTitle?: string;      // denormalized for display; falls back to "All Forms" when absent with no formId
  /** Name snapshot of the stage this job was scoped to ("job row shows the stage
   * name snapshot"). Not built yet in the backend. */
  stage?: { id: string; name: string; colour: StageColorToken; category: StageCategory };
  /** @deprecated superseded by `stage` above — kept only for an older report job. */
  responseStatus?: 'new' | 'in_progress' | 'completed';
  from?: string;            // ISO 8601
  to?: string;              // ISO 8601
  /** What the export was asked for, as the backend stored it: names a stage export's row, and is sent again on a retry. */
  filters?: Omit<CreateReportPayload, 'format'>;
  /** How many responses were chosen by hand for this export (an export of a selection has no date range). */
  selectedCount?: number;
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
