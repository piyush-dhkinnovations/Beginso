/**
 * __tests__/services/tags.service.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.7, design.md §11.2/§12, task 2.2.
 * Built against the documented (not yet live) contract — see tagsService's own comment.
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
import { tagsService } from '@/services/tags';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

describe('tagsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('list unwraps the {tags} envelope and guards a non-array', async () => {
    mockGet.mockResolvedValueOnce({ data: { tags: [{ id: 't1', name: 'Hot lead', colour: 'success', usageCount: 3 }] } });
    const result = await tagsService.list('acme');
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/acme/tags', { headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toEqual([{ id: 't1', name: 'Hot lead', colour: 'success', usageCount: 3 }]);
  });

  it('list guards a malformed payload to an empty array', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    expect(await tagsService.list('acme')).toEqual([]);
  });

  it('create posts the payload and unwraps {tag}', async () => {
    mockPost.mockResolvedValueOnce({ data: { tag: { id: 't2', name: 'Follow up', colour: 'info' } } });
    const result = await tagsService.create('acme', { name: 'Follow up', colour: 'info' });
    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/acme/tags', { name: 'Follow up', colour: 'info' }, { headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toEqual({ id: 't2', name: 'Follow up', colour: 'info' });
  });

  it('update patches the tag', async () => {
    mockPatch.mockResolvedValueOnce({ data: { tag: { id: 't1', name: 'Renamed', colour: 'success' } } });
    await tagsService.update('acme', 't1', { name: 'Renamed' });
    expect(mockPatch).toHaveBeenCalledWith('/api/workspaces/acme/tags/t1', { name: 'Renamed' }, { headers: { 'x-workspace-slug': 'acme' } });
  });

  it('remove deletes the tag', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });
    const result = await tagsService.remove('acme', 't1');
    expect(mockDelete).toHaveBeenCalledWith('/api/workspaces/acme/tags/t1', { headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toBeUndefined();
  });

  it('merge posts {into} atomically', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });
    await tagsService.merge('acme', 't1', 't2');
    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/acme/tags/t1/merge', { into: 't2' }, { headers: { 'x-workspace-slug': 'acme' } });
  });
});
