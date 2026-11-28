/**
 * Tests: Proxy (formerly "middleware") route protection decisions
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { config, proxy } from '../src/proxy';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/dist/experimental/testing/server/middleware-testing-utils';
import { PROTECTED_PATHS, AUTH_PATHS } from '@/lib/authRoutes';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

/** Helper: build a NextRequest with the same HttpOnly session cookie the BFF writes. */
function makeRequest(path: string, hasToken = false): NextRequest {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  if (hasToken) {
    req.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');
  }
  return req;
}

describe('Next.js Edge Proxy (auth guard)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  // Protected routes (no token)

  describe('Protected route + no cookie → redirect /login', () => {
    const protectedPaths = [
      '/dashboard',
      '/dashboard/settings',
      '/forms',
      '/forms/new',
      '/templates',
      '/responses',
      '/analytics',
      '/reports',
      '/settings',
      '/w/acme',
      '/shared',
      '/workspaces',
      '/my-submissions',
      '/trash',
      '/onboarding',
    ];

    it.each(protectedPaths)(
      '%s without a session cookie redirects to /login',
      async (path) => {
        const req = makeRequest(path, false);
        const res = await proxy(req);
        expect(res.status).toBe(307); // NextResponse.redirect
        expect(res.headers.get('location')).toContain('/login');
      }
    );
  });

  // Protected routes (with token) → allow through

  describe('Protected route + cookie present → NextResponse.next()', () => {
    const protectedPaths = ['/dashboard', '/forms', '/templates', '/responses', '/analytics', '/reports', '/settings', '/w/acme', '/shared'];

    it.each(protectedPaths)(
      '%s with a session cookie passes through',
      async (path) => {
        const req = makeRequest(path, true);
        const res = await proxy(req);
        // next() has no location header and status 200
        expect(res.headers.get('location')).toBeNull();
        expect(res.status).toBe(200);
      }
    );
  });

  // Auth pages (login / signup) with token → redirect /dashboard

  describe('Auth page + cookie present → redirect /dashboard', () => {
    it('/login with a valid session cookie redirects to /dashboard', async () => {
      const req = makeRequest('/login', true);
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('/signup with a valid session cookie redirects to /dashboard', async () => {
      const req = makeRequest('/signup', true);
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('/verify-email with a valid session redirects to /dashboard', async () => {
      const res = await proxy(makeRequest('/verify-email', true));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('/verification-code with a valid session redirects to /dashboard', async () => {
      const res = await proxy(makeRequest('/verification-code', true));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });
  });

  // Auth pages without token → allow through

  describe('Auth page + no cookie → NextResponse.next()', () => {
    it('/login without a session cookie passes through', async () => {
      const req = makeRequest('/login', false);
      const res = await proxy(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it('/signup without a session cookie passes through', async () => {
      const req = makeRequest('/signup', false);
      const res = await proxy(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it.each(['/verify-email', '/verification-code', '/forgot-password', '/reset-password'])('%s without a session passes through', async (path) => {
      const res = await proxy(makeRequest(path, false));
      expect(res.headers.get('location')).toBeNull();
    });
  });

  it('rejects a forged or expired session cookie and clears it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const res = await proxy(makeRequest('/dashboard', true));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=`);
  });

  // A15-004: a backend that cannot answer says nothing about the session, so it must neither log the person out nor delete the cookie.
  it.each([500, 502, 429])('a %s from the session check keeps the person on the page and does not clear the cookie', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
    const res = await proxy(makeRequest('/dashboard', true));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('a network failure during the session check is treated the same way', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const res = await proxy(makeRequest('/dashboard', true));
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  // Legacy /inbox/<id>?scope=<slug> → /w/<slug>/inbox/<id> redirect
  // Old links (notifications, emails, activity) used ?scope= on the personal route;
  // workspace responses now live at /w/[slug]/inbox/[id] so the WorkspaceShell renders.

  describe('Legacy workspace response links redirect to the workspace route', () => {
    it('redirects /inbox/<id>?scope=<slug> to /w/<slug>/inbox/<id> with 308', async () => {
      const res = await proxy(makeRequest('/inbox/resp-1?scope=acme', true));
      expect(res.status).toBe(308);
      const loc = res.headers.get('location') ?? '';
      expect(loc).toContain('/w/acme/inbox/resp-1');
      expect(loc).not.toContain('scope=');
    });

    it('forwards other query params (formId, returnTo) but drops scope', async () => {
      const res = await proxy(makeRequest('/inbox/resp-1?scope=acme&formId=f1&returnTo=%2Fw%2Facme%2Finbox', true));
      expect(res.status).toBe(308);
      const loc = new URL(res.headers.get('location') ?? 'http://x');
      expect(loc.pathname).toBe('/w/acme/inbox/resp-1');
      expect(loc.searchParams.get('formId')).toBe('f1');
      expect(loc.searchParams.get('returnTo')).toBeTruthy();
      expect(loc.searchParams.has('scope')).toBe(false);
    });

    it('does not redirect /inbox/<id> without ?scope= (personal response)', async () => {
      const res = await proxy(makeRequest('/inbox/resp-1', true));
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('does not redirect /inbox/<id>?scope=personal', async () => {
      const res = await proxy(makeRequest('/inbox/resp-1?scope=personal', true));
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('unauthenticated legacy link goes to /login (not to the workspace route)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
      const res = await proxy(makeRequest('/inbox/resp-1?scope=acme', false));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login');
    });

    // Mutation check: removing the scope guard breaks the redirect.
    it('mutation: without the scope guard /inbox/<id> would not redirect (confirms the guard is load-bearing)', async () => {
      // A request without scope must NOT redirect — this test fails if we accidentally
      // redirect all /inbox/<id> requests regardless of scope.
      const res = await proxy(makeRequest('/inbox/resp-1', true));
      expect(res.headers.get('location')).toBeNull();
    });
  });
});

// A page Next loads ahead of a click (a router prefetch) only needs the session cookie; a real visit gets the backend check.
// config.matcher decides which requests reach proxy(), so these go through the matcher first, exactly as Next does.
describe('Router prefetch rule', () => {
  const PREFETCH = { 'next-router-prefetch': '1', rsc: '1' };
  const me = vi.fn();

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    me.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', me);
  });

  /** What happens to one request: null when it never reaches proxy() (it passes straight through). */
  async function visit(path: string, { prefetch = false, cookie }: { prefetch?: boolean; cookie?: string } = {}) {
    const headers: Record<string, string> = prefetch ? { ...PREFETCH } : {};
    const cookies: Record<string, string> = cookie === undefined ? {} : { [SESSION_COOKIE_NAME]: cookie };
    const url = `http://localhost:3000${path}`;
    if (!unstable_doesMiddlewareMatch({ config, url, headers, cookies })) return null;
    const req = new NextRequest(url);
    if (cookie !== undefined) req.cookies.set(SESSION_COOKIE_NAME, cookie);
    return proxy(req);
  }

  const outsideWorkspace = PROTECTED_PATHS.filter((root) => root !== '/w').flatMap((root) => [root, `${root}/abc123`]);
  const workspace = ['/w/acme', '/w/acme/forms', '/w/acme/inbox/r1'];

  it.each([...outsideWorkspace, ...workspace])('%s: a prefetch without the cookie goes to /login, asking the backend nothing', async (path) => {
    const res = await visit(path, { prefetch: true });
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/login');
    expect(me).not.toHaveBeenCalled();
  });

  it('an empty cookie counts as no cookie', async () => {
    const res = await visit('/dashboard', { prefetch: true, cookie: '' });
    expect(res?.headers.get('location')).toContain('/login');
    expect(me).not.toHaveBeenCalled();
  });

  it.each(outsideWorkspace)('%s: a prefetch with the cookie passes without a backend call', async (path) => {
    expect(await visit(path, { prefetch: true, cookie: 'jwt' })).toBeNull();
    expect(me).not.toHaveBeenCalled();
  });

  it.each(workspace)('%s: a workspace prefetch keeps the full check, since its response carries the workspace name', async (path) => {
    const res = await visit(path, { prefetch: true, cookie: 'jwt' });
    expect(res?.headers.get('location')).toBeNull();
    expect(me).toHaveBeenCalledTimes(1);
  });

  it.each([...outsideWorkspace, ...workspace])('%s: a real visit asks the backend', async (path) => {
    const res = await visit(path, { cookie: 'jwt' });
    expect(res?.headers.get('location')).toBeNull();
    expect(me).toHaveBeenCalledTimes(1);
  });

  it.each(['/dashboard', '/forms/abc123/edit', '/settings', '/w/acme'])(
    '%s: a real visit with an invalid or expired session goes to /login, clears the cookie, and /login then stays put',
    async (path) => {
      me.mockResolvedValue(new Response(null, { status: 401 }));
      const res = await visit(path, { cookie: 'expired' });
      expect(res?.status).toBe(307);
      expect(new URL(res!.headers.get('location')!).searchParams.get('next')).toBe(path);
      expect(res?.headers.get('set-cookie')).toContain(`${SESSION_COOKIE_NAME}=;`);

      // No loop: the login page lets the same bad cookie in (and a cleared one too).
      expect((await visit('/login', { cookie: 'expired' }))?.headers.get('location')).toBeNull();
      expect((await visit('/login'))?.headers.get('location')).toBeNull();
    }
  );

  it('a visitor with no cookie is sent to /login on a real visit', async () => {
    const res = await visit('/dashboard');
    expect(res?.headers.get('location')).toContain('/login');
    expect(me).not.toHaveBeenCalled();
  });

  it('sign-in pages keep the full check, prefetched or not', async () => {
    for (const path of AUTH_PATHS) {
      const res = await visit(path, { prefetch: true, cookie: 'jwt' });
      expect(res?.headers.get('location')).toContain('/dashboard');
    }
    expect(me).toHaveBeenCalledTimes(AUTH_PATHS.length);
  });

  it('an old /inbox/<id>?scope= link is still redirected when prefetched', async () => {
    const res = await visit('/inbox/r1?scope=acme', { prefetch: true, cookie: 'jwt' });
    expect(res?.status).toBe(308);
    expect(res?.headers.get('location')).toContain('/w/acme/inbox/r1');
  });

  it('does not run on public pages', async () => {
    for (const path of ['/', '/terms', '/f/some-form', '/forms-help']) {
      expect(await visit(path, { cookie: 'jwt' })).toBeNull();
    }
  });
});
