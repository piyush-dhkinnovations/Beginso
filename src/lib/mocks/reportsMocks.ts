/**
 * Mock fixtures for Reports export — `__tests__/` fixtures only; runtime code builds directly
 * against the confirmed-live backend (see docs/backend-contract/api-reference.md §4). Same
 * factory-with-overrides shape as `responsesMocks.ts`.
 */

import type { ReportJob, ReportStatus } from '@/types/report';

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
