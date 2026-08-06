import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/responses/[responseId]/file/[fileId]/route';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

const context = { params: Promise.resolve({ responseId: 'r1', fileId: 'f1' }) };

function authenticatedRequest(): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/responses/r1/file/f1');
  request.cookies.set(SESSION_COOKIE_NAME, 'server-only.jwt');
  return request;
}

describe('response-file server proxy', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
  });

  it('removes legacy query-string credentials and authenticates server-to-server', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: 'https://backend.example/api/upload/file/document.pdf?token=leak&access_token=leak-too&download=1',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response('file bytes', { status: 200, headers: { 'content-type': 'application/pdf' } })
      );

    const response = await GET(authenticatedRequest(), context);
    const [fileUrl, init] = mockFetch.mock.calls[1] as [URL, RequestInit];

    expect(response.status).toBe(200);
    expect(fileUrl.searchParams.has('token')).toBe(false);
    expect(fileUrl.searchParams.has('access_token')).toBe(false);
    expect(fileUrl.origin).toBe('https://backend.example');
    expect(fileUrl.search).toBe('');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-only.jwt');
    expect(init.redirect).toBe('manual');
    expect((mockFetch.mock.calls[0][1] as RequestInit).redirect).toBe('manual');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('refuses to send the session token to a different file host', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ url: 'https://attacker.example/file.pdf' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const response = await GET(authenticatedRequest(), context);

    expect(response.status).toBe(502);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rebases a backend-generated internal URL onto the configured backend origin', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: 'http://localhost:5000/api/upload/file/workspace/form/responses/response/document.pdf?token=leak',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response('file bytes', { status: 200 }));

    const response = await GET(authenticatedRequest(), context);
    const [fileUrl] = mockFetch.mock.calls[1] as [URL, RequestInit];

    expect(response.status).toBe(200);
    expect(fileUrl.toString()).toBe(
      'https://backend.example/api/upload/file/workspace/form/responses/response/document.pdf'
    );
  });

  it('does not follow redirects that could bypass the origin check', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: 'https://backend.example/api/upload/file/document.pdf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }));

    await GET(authenticatedRequest(), context);

    expect((mockFetch.mock.calls[1][1] as RequestInit).redirect).toBe('manual');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
