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

  it('list() unwraps the real { success, workspaces, total } envelope (confirmed live 07 Sep 2026)', async () => {
    const workspaces = [{ id: 'w1', name: 'Acme', slug: 'acme', role: 'owner', isOwner: true, memberCount: 1 }];
    mockGet.mockResolvedValueOnce({ data: { success: true, workspaces, total: 1 } });

    const result = await workspacesService.list();

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces');
    expect(result).toEqual(workspaces);
  });

  it('list() falls back to a bare array if the response is ever shaped that way', async () => {
    const workspaces = [{ id: 'w1', name: 'Acme', slug: 'acme', role: 'owner' }];
    mockGet.mockResolvedValueOnce({ data: workspaces });

    const result = await workspacesService.list();

    expect(result).toEqual(workspaces);
  });

  it('get(id) calls GET /api/workspaces/:id and unwraps a { workspace } envelope', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockGet.mockResolvedValueOnce({ data: { workspace } });

    const result = await workspacesService.get('w1');

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/w1');
    expect(result).toEqual(workspace);
  });

  it('get(id) falls back to a bare object if the response is ever shaped that way', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockGet.mockResolvedValueOnce({ data: workspace });

    const result = await workspacesService.get('w1');

    expect(result).toEqual(workspace);
  });

  // Corrected 10 Sep 2026 — real bug found live: create() previously assumed a bare response and
  // read workspace.slug straight off it, which sent the user to /w/undefined because the real
  // response is enveloped like every other workspace endpoint, not bare.
  it('create(payload) posts to /api/workspaces and unwraps a { workspace } envelope', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce({ data: { workspace } });

    const result = await workspacesService.create({ name: 'Acme' });

    expect(mockPost).toHaveBeenCalledWith('/api/workspaces', { name: 'Acme' });
    expect(result).toEqual(workspace);
    expect(result.slug).toBe('acme');
  });

  it('create(payload) falls back to a bare object if the response is ever shaped that way', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    mockPost.mockResolvedValueOnce({ data: workspace });

    const result = await workspacesService.create({ name: 'Acme' });

    expect(result).toEqual(workspace);
  });
});
