import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

/**
 * Proxies a completed report's file download through this Next.js server, same rationale as
 * src/app/api/responses/[responseId]/file/[fileId]/route.ts: the HttpOnly Beginso session must
 * never appear in a browser-visible URL or be handed to client JS as a bearer token. Reports'
 * `GET /api/reports/:id/file` streams the file directly (no metadata/storage-URL indirection
 * step the responses endpoint needs), so this is a single-stage forward-and-stream proxy.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  if (!/^[a-f\d]{24}$/i.test(reportId)) {
    return NextResponse.json({ success: false, message: 'Invalid report ID' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return NextResponse.json({ success: false, message: 'Backend API is not configured' }, { status: 500 });
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ success: false, message: 'Missing authorization' }, { status: 401 });
  }

  const fileRes = await fetch(`${apiBase}/api/reports/${reportId}/file`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    cache: 'no-store',
    // Never let an upstream redirect send this server-held bearer token to another host.
    redirect: 'manual',
  });

  if (!fileRes.ok || !fileRes.body) {
    const errorText = await fileRes.text().catch(() => '');
    let errorBody: Record<string, unknown> = { success: false, message: 'Failed to fetch report file' };
    try {
      if (errorText) errorBody = JSON.parse(errorText);
    } catch {
      // non-JSON body — keep the generic fallback, raw text is logged below for diagnosis
    }
    console.error(`[report-file-proxy] file fetch failed reportId=${reportId} status=${fileRes.status} body=${errorText.slice(0, 500)}`);
    return NextResponse.json(errorBody, {
      status: fileRes.status || 502,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const contentDisposition = fileRes.headers.get('content-disposition');
  // Forwarded so the browser can compute a real download percentage — only present when the
  // upstream response wasn't chunked/streamed without a known length.
  const contentLength = fileRes.headers.get('content-length');
  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': fileRes.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
  });
}
