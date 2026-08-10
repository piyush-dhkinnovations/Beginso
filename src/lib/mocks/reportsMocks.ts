/**
 * Mock fixtures for Reports export (Sprint 5) — unblocks frontend work while
 * `POST/GET /api/reports*` is not yet confirmed live (see requirements.md §15).
 * Same factory-with-overrides shape as `responsesMocks.ts`.
 */

import type { ReportJob, PaginatedReportsResult, ReportStatus } from '@/types/report';

export function mockReportJob(overrides: Partial<ReportJob> & { status?: ReportStatus } = {}): ReportJob {
  return {
    _id: 'report-1',
    format: 'csv',
    status: 'queued',
    formId: 'form-1',
    formTitle: 'Customer Feedback Survey',
    createdAt: '2026-08-10T09:00:00.000Z',
    ...overrides,
  };
}

export function mockReportsList(overrides: Partial<PaginatedReportsResult> = {}): PaginatedReportsResult {
  const data: ReportJob[] = [
    mockReportJob({ _id: 'report-1', format: 'csv', status: 'queued', createdAt: '2026-08-10T09:05:00.000Z' }),
    mockReportJob({ _id: 'report-2', format: 'pdf', status: 'processing', createdAt: '2026-08-10T09:00:00.000Z' }),
    mockReportJob({
      _id: 'report-3',
      format: 'csv',
      status: 'completed',
      createdAt: '2026-08-09T16:20:00.000Z',
      completedAt: '2026-08-09T16:21:30.000Z',
      expiresAt: '2026-08-16T16:21:30.000Z',
    }),
    mockReportJob({
      _id: 'report-4',
      format: 'pdf',
      status: 'failed',
      formId: undefined,
      formTitle: undefined,
      createdAt: '2026-08-09T11:00:00.000Z',
      errorMessage: 'Report generation timed out. Please try again.',
    }),
    mockReportJob({
      _id: 'report-5',
      format: 'csv',
      status: 'expired',
      formId: 'form-2',
      formTitle: 'Event Registration',
      createdAt: '2026-08-01T08:00:00.000Z',
      completedAt: '2026-08-01T08:02:00.000Z',
      expiresAt: '2026-08-08T08:02:00.000Z',
    }),
  ];
  return { data, total: data.length, page: 1, limit: 50, totalPages: 1, ...overrides };
}
