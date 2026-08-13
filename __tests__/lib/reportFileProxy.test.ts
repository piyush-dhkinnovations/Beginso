/**
 * __tests__/lib/reportFileProxy.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: src/app/api/reports/[reportId]/file/route.ts — same-origin secure file download proxy,
 * verbatim security posture of the responses file-proxy route
 * Requirements: 12.1
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reports/[reportId]/file/route';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

const reportId = '6a74617a6456cf02fec467ec';
const context = { params: Promise.resolve({ reportId }) };

function authenticatedRequest(): NextRequest {
  const request = new NextRequest(`http://localhost:3000/api/reports/${reportId}/file`);
  request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');
  return request;
}

describe('report-file server proxy', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
  });

  it('rejects an invalid report ID before contacting the backend', async () => {
    const response = await GET(authenticatedRequest(), { params: Promise.resolve({ reportId: 'not-an-id' }) });

    expect(response.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request before contacting the backend', async () => {
    const request = new NextRequest(`http://localhost:3000/api/reports/${reportId}/file`);
    const response = await GET(request, context);

    expect(response.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('forwards the session as a Bearer header, refuses redirects, and streams the file back private/no-store', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('file bytes', {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="report.pdf"' },
      })
    );

    const response = await GET(authenticatedRequest(), context);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];

    expect(response.status).toBe(200);
    expect(url).toBe(`https://backend.example/api/reports/${reportId}/file`);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-only.jwt');
    expect(init.redirect).toBe('manual');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="report.pdf"');
  });

  it('relays the upstream error status/body without caching it', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: 'Report expired' }), {
        status: 410,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await GET(authenticatedRequest(), context);
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({ success: false, message: 'Report expired' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns 500 when the backend URL is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');

    const response = await GET(authenticatedRequest(), context);

    expect(response.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
