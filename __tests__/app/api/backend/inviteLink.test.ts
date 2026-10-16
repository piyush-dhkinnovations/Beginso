/**
 * D2-001: a signed-out person opening an emailed invite link got a 401 from the proxy (although the backend preview is
 * public), and the 401 handler sent them to /login without remembering the invite. Only the GET previews are public;
 * accepting still needs a session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/backend/[...path]/route';

const signedOut = (path: string, method = 'GET') => new NextRequest(`http://localhost:3000/api/backend/${path}`, { method });

describe('BFF proxy: invitation preview while signed out', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://backend.example');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, invitation: { status: 'pending' } }), { status: 200 })));
  });

  it.each([
    'api/invitations/abc123_-DEF',
    'api/invitations/preview/abc123_-DEF',
    'api/invitations/token/abc123_-DEF',
    'api/invitations/garbage',
  ])('forwards GET %s with no session and no Authorization header', async (path) => {
    const res = await GET(signedOut(path), { params: Promise.resolve({ path: path.split('/') }) });
    expect(res.status).toBe(200);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toBe(`https://backend.example/${path}`);
    expect((init.headers as Headers).get('authorization')).toBeNull();
  });

  it('still refuses accept without a session', async () => {
    const res = await POST(signedOut('api/invitations/abc123/accept', 'POST'), { params: Promise.resolve({ path: ['api', 'invitations', 'abc123', 'accept'] }) });
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('still refuses other invitation reads without a session (the workspace invitation list)', async () => {
    const res = await GET(signedOut('api/invitations/workspace/abc/list'), { params: Promise.resolve({ path: ['api', 'invitations', 'workspace', 'abc', 'list'] }) });
    expect(res.status).toBe(401);
  });

  it('a non-GET to the preview path is not public', async () => {
    const res = await POST(signedOut('api/invitations/abc123', 'POST'), { params: Promise.resolve({ path: ['api', 'invitations', 'abc123'] }) });
    expect(res.status).toBe(401);
  });
});
