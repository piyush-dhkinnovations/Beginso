/**
 * __tests__/app/api/backend/route.test.ts
 * Regression test for a real bug: this proxy silently dropped every request header not on its
 * fixed forward-list, including x-workspace-slug/x-workspace-id — the one documented mechanism
 * (API_CONTRACT.md's "Workspace Resolution" order, step 1) `formsService.getForms()` relies on
 * to scope GET /api/forms to the right personal/workspace context. The frontend fix was a no-op
 * end-to-end until this proxy actually forwarded the header too.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/backend/[...path]/route';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

function makeRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(`http://localhost:3000/api/backend/${path}`, { headers });
  req.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');
  return req;
}

describe('BFF proxy — header forwarding', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ forms: [] }), { status: 200 })));
  });

  it('forwards x-workspace-slug to the real backend', async () => {
    const req = makeRequest('api/forms', { 'x-workspace-slug': 'acme' });
    await GET(req, { params: Promise.resolve({ path: ['api', 'forms'] }) });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.get('x-workspace-slug')).toBe('acme');
  });

  it('forwards x-workspace-id to the real backend', async () => {
    const req = makeRequest('api/forms', { 'x-workspace-id': 'w-123' });
    await GET(req, { params: Promise.resolve({ path: ['api', 'forms'] }) });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.get('x-workspace-id')).toBe('w-123');
  });

  it('does not send a workspace header at all when the caller sent none', async () => {
    const req = makeRequest('api/forms');
    await GET(req, { params: Promise.resolve({ path: ['api', 'forms'] }) });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.has('x-workspace-slug')).toBe(false);
    expect(sentHeaders.has('x-workspace-id')).toBe(false);
  });

  it('sends the shared proxy secret to the backend when configured, and never one the caller supplied', async () => {
    vi.stubEnv('BACKEND_PROXY_SECRET', 'shared-secret');
    await GET(makeRequest('api/forms', { 'x-proxy-secret': 'caller-guess' }), { params: Promise.resolve({ path: ['api', 'forms'] }) });
    let [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).get('x-proxy-secret')).toBe('shared-secret');

    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    (fetch as ReturnType<typeof vi.fn>).mockClear();
    await GET(makeRequest('api/forms', { 'x-proxy-secret': 'caller-guess' }), { params: Promise.resolve({ path: ['api', 'forms'] }) });
    [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((init.headers as Headers).has('x-proxy-secret')).toBe(false);
  });

  // sprint-11-v2a-hardening 4.3 — the whitelist must be closed, not just "includes the workspace
  // headers": an arbitrary header the caller sends must never reach the real backend un-vetted.
  it('does not forward an arbitrary header the caller sent (whitelist is closed)', async () => {
    const req = makeRequest('api/forms', { 'x-evil-header': 'smuggled', 'x-forwarded-host': 'evil.example' });
    await GET(req, { params: Promise.resolve({ path: ['api', 'forms'] }) });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentHeaders = init.headers as Headers;
    expect(sentHeaders.has('x-evil-header')).toBe(false);
    expect(sentHeaders.has('x-forwarded-host')).toBe(false);
  });
});

// sprint-11-v2a-hardening 1.5 — events/audit routes live under the already-allowlisted
// 'workspaces' and 'forms' roots (GET /api/workspaces/:id/events|audit, GET /api/forms/:id/events),
// so no new ALLOWED_API_ROOTS entry is needed. Asserted here rather than guessed, per task 1.5.
describe('BFF proxy — allowlist', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ events: [] }), { status: 200 })));
  });

  it('allows GET /api/workspaces/:id/events (Sprint 10 events table)', async () => {
    const req = makeRequest('api/workspaces/w1/events');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'workspaces', 'w1', 'events'] }) });
    expect(res.status).not.toBe(404);
    expect(fetch).toHaveBeenCalled();
  });

  it('allows GET /api/workspaces/:id/audit', async () => {
    const req = makeRequest('api/workspaces/w1/audit');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'workspaces', 'w1', 'audit'] }) });
    expect(res.status).not.toBe(404);
    expect(fetch).toHaveBeenCalled();
  });

  it('allows GET /api/forms/:id/events', async () => {
    const req = makeRequest('api/forms/f1/events');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'forms', 'f1', 'events'] }) });
    expect(res.status).not.toBe(404);
    expect(fetch).toHaveBeenCalled();
  });

  it('rejects an unknown root with 404 "Backend path is not allowed"', async () => {
    const req = makeRequest('api/not-a-real-root');
    const res = await GET(req, { params: Promise.resolve({ path: ['api', 'not-a-real-root'] }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error ?? body.message).toMatch(/not allowed/i);
  });
});
