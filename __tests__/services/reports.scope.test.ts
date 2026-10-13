import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { reportsService } from '@/services/reports';

const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const payload = { format: 'csv', formId: 'form-1' } as Parameters<typeof reportsService.createReport>[0];

describe('reportsService.createReport', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('sends the workspace slug as the scope header', async () => {
    mockPost.mockResolvedValueOnce({ data: { report: { id: 'r1', format: 'csv', status: 'queued', createdAt: '2026-10-01T00:00:00Z' } } });
    const job = await reportsService.createReport(payload, 'acme');
    expect(mockPost).toHaveBeenCalledWith('/api/reports', payload, { headers: { 'x-workspace-slug': 'acme' } });
    expect(job._id).toBe('r1');
  });

  it('propagates a 403 unchanged instead of rewriting it', async () => {
    const err = Object.assign(new Error('Request failed with status code 403'), {
      response: { status: 403, data: { message: 'Forbidden by backend' } },
    });
    mockPost.mockRejectedValueOnce(err);
    await expect(reportsService.createReport(payload, 'acme')).rejects.toBe(err);
  });

  it('propagates other errors as-is', async () => {
    const err = new Error('network down');
    mockPost.mockRejectedValueOnce(err);
    await expect(reportsService.createReport(payload)).rejects.toBe(err);
  });
});
