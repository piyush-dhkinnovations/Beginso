import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * Proxies a response's file download through this Next.js server instead of letting the
 * browser fetch it from the backend's file host directly. Confirmed 08 Aug 2026: that endpoint
 * is reachable via a plain top-level navigation (not CORS-restricted — window.open reaches it
 * and gets a real, if unauthorized, JSON response) but silently blocks an authenticated
 * XHR/fetch with a bare CORS network error, no HTTP response at all. CORS is a browser-only
 * restriction — a server-to-server fetch from here isn't subject to it, so this sidesteps the
 * problem regardless of which exact upstream CORS/host misconfiguration is causing it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string; fileId: string }> }
) {
  const { responseId, fileId } = await params;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ success: false, message: 'Missing authorization' }, { status: 401 });
  }
  // Backend's 08 Aug 2026 fix (docs/backend-contract/known-issues/response-file-download.md)
  // added support for the token as a `?token=` query param alongside the Authorization header
  // — designed for <audio>/<video> tags, which can't attach custom headers at all. Sent on
  // both legs here too: harmless when the header alone already works, and a safety net if any
  // reverse proxy/CDN in front of the backend strips the Authorization header on this route
  // specifically (the header survives to our own server either way; only the *next* hop is in
  // question).
  const token = authHeader.replace(/^Bearer\s+/i, '');
  function withToken(url: string) {
    const u = new URL(url);
    u.searchParams.set('token', token);
    return u.toString();
  }

  const metaRes = await fetch(withToken(`${API_BASE}/api/responses/${responseId}/file/${fileId}`), {
    headers: { Authorization: authHeader },
  });
  const metaBody: { url?: string; message?: string } = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || !metaBody.url) {
    return NextResponse.json(metaBody, { status: metaRes.ok ? 502 : metaRes.status });
  }

  const fileRes = await fetch(withToken(metaBody.url), { headers: { Authorization: authHeader } });
  if (!fileRes.ok || !fileRes.body) {
    // Relay the real body when the storage host sent one (e.g. its own JSON error) instead of
    // masking it behind a generic message — whoever debugs the next failure needs to see which
    // of the two upstream calls actually rejected the request, and why.
    const fileErrorBody = await fileRes.json().catch(() => ({ success: false, message: 'Failed to fetch file from storage' }));
    return NextResponse.json(fileErrorBody, { status: fileRes.status || 502 });
  }

  return new NextResponse(fileRes.body, {
    headers: { 'Content-Type': fileRes.headers.get('content-type') ?? 'application/octet-stream' },
  });
}
