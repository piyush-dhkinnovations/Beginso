import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { formsService } from '@/services/forms';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

describe('formsService.getForms sorting', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { forms: [], total: 0, page: 1, limit: 10 } });
  });

  it('passes sort and order through as query params', async () => {
    await formsService.getForms({ sort: 'title', order: 'asc', page: 2, limit: 10 });
    expect(mockGet.mock.calls[0][0]).toBe('/api/forms');
    expect(mockGet.mock.calls[0][1].params).toEqual({ sort: 'title', order: 'asc', page: 2, limit: 10 });
  });

  it.each(['title', 'status', 'updatedAt'] as const)('supports sort=%s', async (sort) => {
    await formsService.getForms({ sort, order: 'desc' });
    expect(mockGet.mock.calls[0][1].params).toMatchObject({ sort, order: 'desc' });
  });

  it('sends no sort params when none are given', async () => {
    await formsService.getForms({ page: 1 });
    const params = mockGet.mock.calls[0][1].params;
    expect(params).not.toHaveProperty('sort');
    expect(params).not.toHaveProperty('order');
  });

  it('keeps sort alongside the personal workspace param', async () => {
    await formsService.getForms({ sort: 'status', order: 'asc' }, { type: 'personal' });
    expect(mockGet.mock.calls[0][1].params).toEqual({ sort: 'status', order: 'asc', workspaceId: 'personal' });
  });

  it('normalises the pinned flag on each row', async () => {
    mockGet.mockResolvedValueOnce({ data: { forms: [{ _id: 'a', pinned: true, pinnedAt: 'x' }, { _id: 'b' }], total: 2, page: 1, limit: 10 } });
    const res = await formsService.getForms();
    expect(res.forms).toMatchObject([{ pinned: true, pinnedAt: 'x' }, { pinned: false, pinnedAt: null }]);
  });
});

describe('formsService.getAllForms', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  const pageOf = (total: number) => (_url: string, cfg: { params: { page: number } }) =>
    Promise.resolve({ data: { forms: [{ _id: `p${cfg.params.page}` }], total, page: cfg.params.page, limit: 50 } });

  it('makes one request when everything fits on a page', async () => {
    mockGet.mockImplementation(pageOf(30));
    const res = await formsService.getAllForms();
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][1].params).toMatchObject({ page: 1, limit: 50 });
    expect(res.forms).toHaveLength(1);
  });

  it('pages through the remaining pages and concatenates them in order', async () => {
    mockGet.mockImplementation(pageOf(120));
    const res = await formsService.getAllForms(undefined, { status: 'draft' });
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(mockGet.mock.calls.map((c) => c[1].params.page).sort()).toEqual([1, 2, 3]);
    expect(mockGet.mock.calls.every((c) => c[1].params.status === 'draft')).toBe(true);
    expect(res.forms.map((f) => f._id)).toEqual(['p1', 'p2', 'p3']);
    expect(res.limit).toBe(50);
    expect(res.total).toBe(120);
  });

  it('stops at 40 pages of 50 however large the total is', async () => {
    mockGet.mockImplementation(pageOf(1_000_000));
    const res = await formsService.getAllForms();
    expect(mockGet).toHaveBeenCalledTimes(40);
    expect(Math.max(...mockGet.mock.calls.map((c) => c[1].params.page))).toBe(40);
    expect(res.forms).toHaveLength(40);
  });

  it('requests exactly 40 pages when the total is exactly 2000', async () => {
    mockGet.mockImplementation(pageOf(2000));
    await formsService.getAllForms();
    expect(mockGet).toHaveBeenCalledTimes(40);
  });
});
