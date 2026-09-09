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

  it('returns ok:false status:error when there is no token', async () => {
    // Not a confirmed 404 — proxy.ts should never let a request through to this layout
    // without a valid session, so this is an unexpected/error condition, not "workspace
    // doesn't exist". Collapsing it into 404 previously meant a workspace could get
    // permanently not-found'd for a reason that has nothing to do with its existence.
    const result = await resolveWorkspaceBySlug('acme', undefined);
    expect(result).toEqual({ ok: false, status: 'error' });
  });

  it('returns ok:false status:error when the API base is not configured', async () => {
    vi.unstubAllEnvs();
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 'error' });
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

  it('returns status:error, not 404, on a 500 response', async () => {
    // The bug this guards against: a real backend failure was previously indistinguishable
    // from "workspace doesn't exist" and triggered notFound() — a transient 500 should be
    // retryable, not a permanent 404.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 'error' });
  });

  it('fails closed to status:error (not 404) on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await resolveWorkspaceBySlug('acme', 'a-token');
    expect(result).toEqual({ ok: false, status: 'error' });
  });

  it('encodes the slug in the request URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await resolveWorkspaceBySlug('a b/c', 'a-token');
    const [url] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain(encodeURIComponent('a b/c'));
  });

  it('sends the token as a Bearer header, matching proxy.ts\'s own pattern', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await resolveWorkspaceBySlug('acme', 'a-token');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer a-token');
  });
});
