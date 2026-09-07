/**
 * __tests__/proxy.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Proxy (formerly "middleware") route protection decisions
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */

import { beforeEach, describe, it, expect, vi } from 'vitest';
import { proxy } from '../src/proxy';
import { NextRequest } from 'next/server';
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

  // ─── Protected routes (no token) ───────────────────────────────────────────

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

  // ─── Protected routes (with token) → allow through ─────────────────────────

  describe('Protected route + cookie present → NextResponse.next()', () => {
    const protectedPaths = ['/dashboard', '/forms', '/templates', '/responses', '/analytics', '/reports', '/settings', '/w/acme'];

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

  // ─── Auth pages (login / signup) with token → redirect /dashboard ──────────

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

  // ─── Auth pages without token → allow through ─────────────────────────────

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
});
