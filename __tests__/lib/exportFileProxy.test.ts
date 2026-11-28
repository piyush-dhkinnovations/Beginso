/**
 * Tests: src/app/api/workspaces/export/file/route.ts — the same-origin download proxy for a workspace export.
 * Only a well-formed job id reaches the backend.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/workspaces/export/file/route';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

const jobId = '6a74617a6456cf02fec467ec';

function request(query: string, signedIn = true): NextRequest {
  const req = new NextRequest(`http://localhost:3000/api/workspaces/export/file${query}`);
  if (signedIn) req.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');
  return req;
}

describe('export-file server proxy', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['no jobId', ''],
    ['an empty one', '?jobId='],
    ['a word', '?jobId=latest'],
    ['too short', `?jobId=${jobId.slice(1)}`],
    ['too long', `?jobId=${jobId}0`],
    ['not hexadecimal', `?jobId=${'z'.repeat(24)}`],
    ['a path', '?jobId=..%2F..%2Fsecret'],
    ['an added query', `?jobId=${jobId}%26workspaceId%3Dother`],
  ])('rejects %s before contacting the backend', async (_name, query) => {
    const response = await GET(request(query));

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request before contacting the backend', async () => {
    const response = await GET(request(`?jobId=${jobId}`, false));

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('forwards a valid job id with the session, refuses redirects, and streams the file back private/no-store', async () => {
    mockFetch.mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));

    const response = await GET(request(`?jobId=${jobId}`));
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(url).toBe(`https://backend.example/api/workspaces/current/export/file?jobId=${jobId}`);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-only.jwt');
    expect(init.redirect).toBe('manual');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
