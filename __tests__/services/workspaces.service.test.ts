import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { workspacesService } from '@/services/workspaces';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

describe('workspacesService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('list() calls GET /api/workspaces and returns the array as-is', async () => {
    const workspaces = [{ id: 'w1', name: 'Acme', slug: 'acme', role: 'owner' }];
    mockGet.mockResolvedValueOnce({ data: workspaces });

    const result = await workspacesService.list();

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces');
    expect(result).toEqual(workspaces);
  });

  it('get(id) calls GET /api/workspaces/:id', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockGet.mockResolvedValueOnce({ data: workspace });

    const result = await workspacesService.get('w1');

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/w1');
    expect(result).toEqual(workspace);
  });

  it('create(payload) posts to /api/workspaces with the name', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce({ data: workspace });

    const result = await workspacesService.create({ name: 'Acme' });

    expect(mockPost).toHaveBeenCalledWith('/api/workspaces', { name: 'Acme' });
    expect(result).toEqual(workspace);
  });
});
