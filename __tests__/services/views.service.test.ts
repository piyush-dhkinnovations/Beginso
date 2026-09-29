/**
 * __tests__/services/views.service.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.6, design.md §11.2/§12, task 2.2.
 * Built against the documented (not yet live) contract — see viewsService's own comment.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { viewsService } from '@/services/views';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

const VIEW = {
  id: 'v1',
  name: 'Needs screening',
  ownerId: 'u1',
  ownerName: 'Priya',
  visibility: 'team' as const,
  formId: null,
  filters: {},
  viewMode: 'table' as const,
  createdAt: '2026-09-29T00:00:00.000Z',
};

describe('viewsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('list unwraps the {views} envelope and guards a non-array', async () => {
    mockGet.mockResolvedValueOnce({ data: { views: [VIEW] } });
    const result = await viewsService.list('acme', 'form-1');
    expect(mockGet).toHaveBeenCalledWith('/api/views', { params: { formId: 'form-1' }, headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toEqual([VIEW]);
  });

  it('list guards a malformed payload to an empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    expect(await viewsService.list('acme')).toEqual([]);
  });

  it('create posts the payload and unwraps {view}', async () => {
    mockPost.mockResolvedValueOnce({ data: { view: VIEW } });
    const result = await viewsService.create('acme', {
      name: 'Needs screening', visibility: 'team', filters: {}, viewMode: 'table',
    });
    expect(mockPost).toHaveBeenCalledWith(
      '/api/views',
      { name: 'Needs screening', visibility: 'team', filters: {}, viewMode: 'table' },
      { headers: { 'x-workspace-slug': 'acme' } }
    );
    expect(result).toEqual(VIEW);
  });

  it('update patches the view', async () => {
    mockPatch.mockResolvedValueOnce({ data: { view: VIEW } });
    await viewsService.update('acme', 'v1', { name: 'Renamed' });
    expect(mockPatch).toHaveBeenCalledWith('/api/views/v1', { name: 'Renamed' }, { headers: { 'x-workspace-slug': 'acme' } });
  });

  it('remove deletes the view', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });
    const result = await viewsService.remove('acme', 'v1');
    expect(mockDelete).toHaveBeenCalledWith('/api/views/v1', { headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toBeUndefined();
  });
});
