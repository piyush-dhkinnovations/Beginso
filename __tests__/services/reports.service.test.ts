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

  it('createReport calls POST /api/reports with the payload and unwraps the live {success, message, report} envelope', async () => {
    // Real backend shape, confirmed live 13 Aug 2026 — wrapped in {success, message, report},
    // the job keyed `id` (not the originally-assumed bare `_id`-keyed job).
    const payload = { format: 'csv' as const, formId: 'form-1' };
    const raw = {
      success: true,
      message: 'Report job queued successfully',
      report: {
        id: '6a7d80670888f6136902d8d9',
        workspaceId: '6a5de6fe9b64998c9c56b47c',
        format: 'csv',
        status: 'queued',
        formId: 'form-1',
        createdAt: '2026-08-13T09:00:00.000Z',
      },
    };
    mockPost.mockResolvedValueOnce({ data: raw });

    const result = await reportsService.createReport(payload);

    expect(mockPost).toHaveBeenCalledWith('/api/reports', payload);
    expect(result).toEqual({
      _id: '6a7d80670888f6136902d8d9',
      format: 'csv',
      status: 'queued',
      formId: 'form-1',
      formTitle: undefined,
      responseStatus: undefined,
      from: undefined,
      to: undefined,
      createdAt: '2026-08-13T09:00:00.000Z',
      completedAt: undefined,
      expiresAt: undefined,
      errorMessage: undefined,
    });
  });

  it('getReports calls GET /api/reports with params and maps each job\'s id to _id', async () => {
    // Real live shape (22 Sep 2026 capture): the job array is keyed `reports`, not `data` —
    // the previous mock here asserted the wrong key, which is what let the actual bug (reading
    // r.data.data, always undefined) go unnoticed. See reports.ts's own comment.
    const raw = {
      success: true,
      reports: [
        { id: 'r1', format: 'pdf', status: 'failed', createdAt: '2026-08-13T09:00:00.000Z', errorMessage: 'Failed to generate report due to an internal processing error. Please try again.' },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await reportsService.getReports({ page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/reports', { params: { page: 1, limit: 20 } });
    expect(result.data[0]._id).toBe('r1');
    expect(result.data[0].errorMessage).toBe('Failed to generate report due to an internal processing error. Please try again.');
    expect(result.total).toBe(1);
  });

  it('getReports returns an empty page instead of throwing when `reports` is missing (zero-reports account)', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, reports: [], total: 0, page: 1, limit: 10, totalPages: 0 } });

    const result = await reportsService.getReports({ page: 1, limit: 20 });

    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
  });

  it('getReportById calls GET /api/reports/:id and maps id to _id', async () => {
    const raw = { id: 'report-1', format: 'pdf', status: 'completed', createdAt: '2026-08-10T09:00:00.000Z' };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await reportsService.getReportById('report-1');

    expect(mockGet).toHaveBeenCalledWith('/api/reports/report-1');
    expect(result._id).toBe('report-1');
    expect(result.format).toBe('pdf');
  });

  it('getReportFileBlobUrl fetches the file through the same-origin proxy, reports progress, and returns a blob: URL', async () => {
    const blob = new Blob(['csv,data'], { type: 'text/csv' });
    mockGet.mockImplementationOnce((_url: string, config: { onDownloadProgress?: (e: { loaded: number; total: number }) => void }) => {
      config.onDownloadProgress?.({ loaded: 50, total: 100 });
      return Promise.resolve({ data: blob });
    });
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: createObjectURL });
    const onProgress = vi.fn();

    const result = await reportsService.getReportFileBlobUrl('report-1', onProgress);

    expect(mockGet).toHaveBeenCalledWith(
      `${window.location.origin}/api/reports/report-1/file`,
      expect.objectContaining({ responseType: 'blob' })
    );
    expect(onProgress).toHaveBeenCalledWith(50);
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(result).toBe('blob:mock-url');
  });
});
