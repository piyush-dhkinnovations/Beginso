/**
 * Same-origin BFF session-boundary tests.
 * The backend JWT must be consumed server-side, stored only in an HttpOnly cookie, and
 * forwarded to the separate backend without ever appearing in browser-visible JSON.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/backend/[...path]/route';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe('backend BFF proxy', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
  });

  it('stores the issued token in an HttpOnly cookie and strips it from session JSON', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'backend.jwt.secret', user: { id: 'u1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const request = new NextRequest('http://localhost:3000/api/backend/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
      body: JSON.stringify({ token: 'firebase.id.token' }),
    });

    const response = await POST(request, context(['api', 'auth', 'session']));
    const payload = await response.json();
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(payload).toEqual({ user: { id: 'u1' } });
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=backend.jwt.secret`);
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');

    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(new Headers(init.headers).has('authorization')).toBe(false);
  });

  it('forwards the HttpOnly session to protected backend calls as a Bearer header', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ forms: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const request = new NextRequest('http://localhost:3000/api/backend/api/forms?page=1');
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    const response = await GET(request, context(['api', 'forms']));
    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit];

    expect(response.status).toBe(200);
    expect(url.toString()).toContain('/api/forms?page=1');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-only.jwt');
  });

  it('forwards the real client IP and User-Agent, not this server\'s own', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ forms: [] }), { status: 200 }));
    const request = new NextRequest('http://localhost:3000/api/backend/api/forms', {
      headers: {
        'x-forwarded-for': '203.0.113.5, 44.212.71.198',
        'user-agent': 'Mozilla/5.0 (real browser)',
      },
    });
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    await GET(request, context(['api', 'forms']));
    const [, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    const forwardedHeaders = new Headers(init.headers);

    // First hop of x-forwarded-for is the original client; later hops are intermediate proxies.
    expect(forwardedHeaders.get('x-client-ip')).toBe('203.0.113.5');
    expect(forwardedHeaders.get('x-client-user-agent')).toBe('Mozilla/5.0 (real browser)');
  });

  it('rejects protected calls without a session before contacting the backend', async () => {
    const request = new NextRequest('http://localhost:3000/api/backend/api/forms');

    const response = await GET(request, context(['api', 'forms']));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('allows the exact pre-session verification routes without a Beginso session', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ message: 'accepted' }), { status: 202 }));

    for (const path of [
      'email-verification',
      'email-verification/reveal',
      'email-verification/verify',
      'confirm-password-reset',
    ]) {
      const request = new NextRequest(`http://localhost:3000/api/backend/api/auth/${path}`, {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'firebase.id.token' }),
      });
      const response = await POST(request, context(['api', 'auth', ...path.split('/')]));
      expect(response.status).toBe(202);
    }

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('allows the Sprint 5 analytics/reports roots and the notifications root (previously 404d before each was added)', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    for (const pathParts of [['api', 'analytics', 'forms'], ['api', 'reports'], ['api', 'notifications']]) {
      const request = new NextRequest(`http://localhost:3000/api/backend/${pathParts.join('/')}`);
      request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

      const response = await GET(request, context(pathParts));

      expect(response.status).toBe(200);
    }
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('rejects non-allowlisted backend paths before forwarding credentials', async () => {
    const request = new NextRequest('http://localhost:3000/api/backend/api/internal/secrets');
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    const response = await GET(request, context(['api', 'internal', 'secrets']));

    expect(response.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects path traversal segments before contacting the backend', async () => {
    const request = new NextRequest('http://localhost:3000/api/backend/api/forms');
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    const response = await GET(request, context(['api', 'forms', '..', 'auth', 'me']));

    expect(response.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects cross-origin state-changing requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/backend/api/forms', {
      method: 'POST',
      headers: { origin: 'https://attacker.example', 'content-type': 'application/json' },
      body: '{}',
    });
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    const response = await POST(request, context(['api', 'forms']));

    expect(response.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('clears the local session even when backend logout is unavailable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'));
    const request = new NextRequest('http://localhost:3000/api/backend/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');

    const response = await POST(request, context(['api', 'auth', 'logout']));

    expect(response.status).toBe(502);
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
