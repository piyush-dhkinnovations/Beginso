import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

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
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return NextResponse.json({ success: false, message: 'Backend API is not configured' }, { status: 500 });
  }
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ success: false, message: 'Missing authorization' }, { status: 401 });
  }
  const authHeader = `Bearer ${sessionToken}`;

  const metaRes = await fetch(`${apiBase}/api/responses/${responseId}/file/${fileId}`, {
    headers: { Authorization: authHeader },
    cache: 'no-store',
    redirect: 'manual',
  });
  const metaText = await metaRes.text();
  let metaBody: { url?: string; message?: string } = {};
  try {
    metaBody = metaText ? JSON.parse(metaText) : {};
  } catch {
    // non-JSON body — metaBody stays {}, raw text is logged below for diagnosis
  }
  if (!metaRes.ok || !metaBody.url) {
    console.error(
      `[file-proxy] metadata fetch failed responseId=${responseId} fileId=${fileId} status=${metaRes.status} body=${metaText.slice(0, 500)}`
    );
    return NextResponse.json(metaBody, { status: metaRes.ok ? 502 : metaRes.status });
  }

  let returnedFileUrl: URL;
  try {
    returnedFileUrl = new URL(metaBody.url, apiBase);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid file URL' }, { status: 502 });
  }
  if (!returnedFileUrl.pathname.startsWith('/api/upload/file/')) {
    return NextResponse.json({ success: false, message: 'Untrusted file path' }, { status: 502 });
  }

  // The backend currently emits its internal localhost origin in this URL. Treat the entire
  // URL as untrusted metadata: retain only the documented file-serving path and resolve that
  // path against the configured backend. No returned hostname or query credential is fetched.
  const fileUrl = new URL(returnedFileUrl.pathname, apiBase);

  const fileRes = await fetch(fileUrl, {
    headers: { Authorization: authHeader },
    cache: 'no-store',
    // Do not let an allowlisted URL redirect the server-side request to another origin.
    redirect: 'manual',
  });
  if (!fileRes.ok || !fileRes.body) {
    // Relay the real body when the storage host sent one (e.g. its own JSON error) instead of
    // masking it behind a generic message — whoever debugs the next failure needs to see which
    // of the two upstream calls actually rejected the request, and why.
    const fileErrorText = await fileRes.text().catch(() => '');
    let fileErrorBody: Record<string, unknown> = { success: false, message: 'Failed to fetch file from storage' };
    try {
      if (fileErrorText) fileErrorBody = JSON.parse(fileErrorText);
    } catch {
      // non-JSON body — keep the generic fallback, raw text is logged below
    }
    console.error(
      `[file-proxy] file fetch failed responseId=${responseId} fileId=${fileId} url=${fileUrl.toString()} status=${fileRes.status} body=${fileErrorText.slice(0, 500)}`
    );
    return NextResponse.json(fileErrorBody, { status: fileRes.status || 502 });
  }

  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': fileRes.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
    },
  });
}
