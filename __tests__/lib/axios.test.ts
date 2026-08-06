/**
 * __tests__/lib/axios.test.ts
 * Feature: sprint-4-responses regression
 * Tests: axiosInstance's response interceptor — a 401/403 from the response-file download
 * proxy must NOT clear the session/redirect to login. A single attachment failing to download
 * (confirmed 08 Aug 2026: a real backend-side permission bug on that one file) is not proof the
 * caller's own session is invalid — logging the whole app out over it is the wrong behavior.
 * Ordinary endpoints keep the original global-logout behavior unchanged.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClearToken = vi.fn();
vi.mock('@/lib/tokenStorage', () => ({
  getToken: () => 'stored.jwt.token',
  clearToken: () => mockClearToken(),
}));

interface InterceptorManager {
  handlers: { rejected: (err: unknown) => Promise<unknown> }[];
}

describe('axiosInstance response interceptor', () => {
  beforeEach(() => {
    mockClearToken.mockReset();
    vi.resetModules();
  });

  async function triggerInterceptor(status: number, url: string) {
    const axiosInstance = (await import('@/lib/axios')).default;
    const rejected = (axiosInstance.interceptors.response as unknown as InterceptorManager).handlers[0].rejected;
    await rejected({ response: { status }, config: { url } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 0)); // let the interceptor's dynamic import().then() resolve
  }

  it('clears the session on a 401 from an ordinary endpoint', async () => {
    await triggerInterceptor(401, 'https://api.example.com/api/forms');
    expect(mockClearToken).toHaveBeenCalledOnce();
  });

  it('clears the session on a 403 from an ordinary endpoint (suspended mid-session)', async () => {
    await triggerInterceptor(403, 'https://api.example.com/api/forms');
    expect(mockClearToken).toHaveBeenCalledOnce();
  });

  it('does NOT clear the session on a 401 from the response-file download proxy', async () => {
    await triggerInterceptor(401, 'http://localhost:3000/api/responses/r1/file/f1');
    expect(mockClearToken).not.toHaveBeenCalled();
  });

  it('does NOT clear the session on a 403 from the response-file download proxy', async () => {
    await triggerInterceptor(403, 'http://localhost:3000/api/responses/r1/file/f1');
    expect(mockClearToken).not.toHaveBeenCalled();
  });

  it('does NOT clear the session on a 401 from an /api/auth/ route (handled locally instead)', async () => {
    await triggerInterceptor(401, 'https://api.example.com/api/auth/me');
    expect(mockClearToken).not.toHaveBeenCalled();
  });
});
