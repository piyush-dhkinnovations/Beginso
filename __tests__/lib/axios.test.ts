/**
 * Cookie-session HTTP client regression tests.
 * Authenticated browser requests must stay same-origin and must never reconstruct an
 * Authorization header from JavaScript-readable storage.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface InterceptorManager {
  handlers: { rejected: (err: unknown) => Promise<unknown> }[];
}

describe('axiosInstance cookie authentication', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('uses the same-origin BFF with credentials and no bearer-token default', async () => {
    const axiosInstance = (await import('@/lib/axios')).default;

    expect(axiosInstance.defaults.baseURL).toBe('/api/backend');
    expect(axiosInstance.defaults.withCredentials).toBe(true);
    expect(axiosInstance.defaults.headers.common.Authorization).toBeUndefined();
  });

  async function triggerInterceptor(status: number, url: string, data?: unknown) {
    const axiosInstance = (await import('@/lib/axios')).default;
    const rejected = (axiosInstance.interceptors.response as unknown as InterceptorManager).handlers[0].rejected;
    await rejected({ response: { status, data }, config: { url } }).catch(() => {});
  }

  it('asks the BFF to destroy the HttpOnly session after an ordinary 401', async () => {
    const pendingFetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', pendingFetch);

    await triggerInterceptor(401, '/api/forms');

    expect(pendingFetch).toHaveBeenCalledWith('/api/backend/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    });
  });

  it('does not destroy the session for a response-file authorization error', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    await triggerInterceptor(401, 'http://localhost:3000/api/responses/r1/file/f1');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('preserves the session for an ordinary resource-scoped 403', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    await triggerInterceptor(403, '/api/responses/r1', { message: 'Forbidden' });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('destroys the session for an explicit ACCOUNT_SUSPENDED 403', async () => {
    const pendingFetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', pendingFetch);

    await triggerInterceptor(403, '/api/forms', { error: { code: 'ACCOUNT_SUSPENDED' } });

    expect(pendingFetch).toHaveBeenCalledWith('/api/backend/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    });
  });

  it('does not recursively destroy the session for an auth-route error', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    await triggerInterceptor(401, '/api/auth/me');

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('401 redirect keeps where the person was going', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function redirectFor(pathname: string, search: string) {
    const assigned: string[] = [];
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
    vi.stubGlobal('window', {
      location: {
        pathname,
        search,
        set href(v: string) {
          assigned.push(v);
        },
        get href() {
          return '';
        },
      },
    });
    const axiosInstance = (await import('@/lib/axios')).default;
    const rejected = (axiosInstance.interceptors.response as unknown as InterceptorManager).handlers[0].rejected;
    await rejected({ response: { status: 401 }, config: { url: '/api/forms' } }).catch(() => {});
    await new Promise((r) => setTimeout(r, 0));
    vi.unstubAllGlobals();
    return assigned[0];
  }

  it('adds ?next= for a page the person was on', async () => {
    expect(await redirectFor('/invite/abc123', '')).toBe('/login?next=%2Finvite%2Fabc123');
    expect(await redirectFor('/forms/1/inbox', '?tab=x')).toBe('/login?next=%2Fforms%2F1%2Finbox%3Ftab%3Dx');
  });

  it('does not loop when already on an auth page', async () => {
    expect(await redirectFor('/login', '')).toBe('/login');
  });
});
