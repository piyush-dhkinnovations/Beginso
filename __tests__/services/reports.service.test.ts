/**
 * __tests__/services/reports.service.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: reportsService — createReport, getReports, getReportById, getReportFileBlobUrl
 * Requirements: 14.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  return {
    default: {
      get: mockGet,
      post: mockPost,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { reportsService } from '@/services/reports';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

describe('reportsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('createReport calls POST /api/reports with the payload and returns the created job', async () => {
    const payload = { format: 'csv' as const, formId: 'form-1' };
    const job = { _id: 'report-1', format: 'csv', status: 'queued', formId: 'form-1', createdAt: '2026-08-10T09:00:00.000Z' };
    mockPost.mockResolvedValueOnce({ data: job });

    const result = await reportsService.createReport(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/reports', payload);
    expect(result).toEqual(job);
  });

  it('getReports calls GET /api/reports with params and returns paginated data', async () => {
    const payload = { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await reportsService.getReports({ page: 1, limit: 50 });

    expect(mockGet).toHaveBeenCalledWith('/api/reports', { params: { page: 1, limit: 50 } });
    expect(result).toEqual(payload);
  });

  it('getReportById calls GET /api/reports/:id and returns the job', async () => {
    const job = { _id: 'report-1', format: 'pdf', status: 'completed', createdAt: '2026-08-10T09:00:00.000Z' };
    mockGet.mockResolvedValueOnce({ data: job });

    const result = await reportsService.getReportById('report-1');

    expect(mockGet).toHaveBeenCalledWith('/api/reports/report-1');
    expect(result).toEqual(job);
  });

  it('getReportFileBlobUrl fetches the file through the same-origin proxy and returns a blob: URL', async () => {
    const blob = new Blob(['csv,data'], { type: 'text/csv' });
    mockGet.mockResolvedValueOnce({ data: blob });
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: createObjectURL });

    const result = await reportsService.getReportFileBlobUrl('report-1');

    expect(mockGet).toHaveBeenCalledWith(`${window.location.origin}/api/reports/report-1/file`, { responseType: 'blob' });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(result).toBe('blob:mock-url');
  });
});
