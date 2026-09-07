/**
 * __tests__/lib/workspaceServer.test.ts
 * Feature: sprint-8-workspaces-context, requirements.md §7.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveWorkspaceBySlug } from '@/lib/workspaceServer';

describe('resolveWorkspaceBySlug', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns ok:false status:404 when there is no token', async () => {
    const result = await resolveWorkspaceBySlug('acme', undefined);
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('returns ok:false status:404 when the API base is not configured', async () => {
    vi.unstubAllEnvs();
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('resolves the workspace on a 200 with a bare object', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(workspace), { status: 200 })));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: true, workspace });
  });

  it('unwraps a { workspace } envelope', async () => {
    const workspace = { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ workspace }), { status: 200 }))
    );
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: true, workspace });
  });

  it('returns status:403 on a 403 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it('returns status:404 on a 404 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('fails closed to 404 on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('sends the token as a Bearer header, matching proxy.ts\'s own pattern', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await resolveWorkspaceBySlug('acme', 'a-token');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer a-token');
  });
});
