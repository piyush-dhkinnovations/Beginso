/**
 * Shared TypeScript interfaces for Reports export (Sprint 5).
 * Shapes match the proposed backend contract in docs/backend-contract/api-reference.md §4 —
 * not yet confirmed live, see requirements.md §15.
 */

export type ReportFormat = 'csv' | 'pdf';
export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  expired: 'Expired',
};

export interface CreateReportPayload {
  format: ReportFormat;
  formId?: string;
  status?: 'new' | 'in_progress' | 'completed';
  search?: string;
  from?: string;
  to?: string;
}

export interface ReportJob {
  _id: string;
  format: ReportFormat;
  status: ReportStatus;
  formId?: string;
  formTitle?: string;      // denormalized for display; falls back to "All Forms" when absent with no formId
  // Echoed-back scope of the original request — assumed, not yet confirmed against a live
  // response (same category of gap Monday's analytics types had before Wednesday's real
  // payloads corrected them). Named `responseStatus` rather than `status` to avoid colliding
  // with this job's own lifecycle `status` above. Used to render Requirement 11.1's "scoping
  // filters used" row and to reconstruct the exact original filters for Requirement 11.5's Retry.
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
