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
});
