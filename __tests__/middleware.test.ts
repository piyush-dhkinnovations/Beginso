/**
 * __tests__/middleware.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Middleware route protection decisions
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */

import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';

/** Helper: build a NextRequest with optional auth_token cookie */
function makeRequest(path: string, hasToken = false): NextRequest {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  if (hasToken) {
    req.cookies.set('auth_token', 'mock.jwt.token');
  }
  return req;
}

describe('Next.js Edge Middleware', () => {
  // ─── Protected routes (no token) ───────────────────────────────────────────

  describe('Protected route + no cookie → redirect /login', () => {
    const protectedPaths = [
      '/dashboard',
      '/dashboard/settings',
      '/forms',
      '/forms/new',
      '/responses',
      '/analytics',
      '/reports',
      '/settings',
    ];

    it.each(protectedPaths)(
      '%s without auth_token redirects to /login',
      (path) => {
        const req = makeRequest(path, false);
        const res = middleware(req);
        expect(res.status).toBe(307); // NextResponse.redirect
        expect(res.headers.get('location')).toContain('/login');
      }
    );
  });

  // ─── Protected routes (with token) → allow through ─────────────────────────

  describe('Protected route + cookie present → NextResponse.next()', () => {
    const protectedPaths = ['/dashboard', '/forms', '/responses', '/analytics', '/reports', '/settings'];

    it.each(protectedPaths)(
      '%s with valid auth_token passes through',
      (path) => {
        const req = makeRequest(path, true);
        const res = middleware(req);
        // next() has no location header and status 200
        expect(res.headers.get('location')).toBeNull();
        expect(res.status).toBe(200);
      }
    );
  });

  // ─── Auth pages (login / signup) with token → redirect /dashboard ──────────

  describe('Auth page + cookie present → redirect /dashboard', () => {
    it('/login with auth_token redirects to /dashboard', () => {
      const req = makeRequest('/login', true);
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('/signup with auth_token redirects to /dashboard', () => {
      const req = makeRequest('/signup', true);
      const res = middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });
  });

  // ─── Auth pages without token → allow through ─────────────────────────────

  describe('Auth page + no cookie → NextResponse.next()', () => {
    it('/login without auth_token passes through', () => {
      const req = makeRequest('/login', false);
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });

    it('/signup without auth_token passes through', () => {
      const req = makeRequest('/signup', false);
      const res = middleware(req);
      expect(res.headers.get('location')).toBeNull();
    });
  });
});
