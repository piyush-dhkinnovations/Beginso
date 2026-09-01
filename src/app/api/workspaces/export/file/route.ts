import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

/**
 * Proxies a workspace export archive's download through this Next.js server, same rationale as
 * src/app/api/reports/[reportId]/file/route.ts: the HttpOnly Beginso session must never appear in
 * a browser-visible URL or be handed to client JS as a bearer token. `GET
 * /api/workspaces/current/export/file` takes the job id as a `?jobId=` query param (not a path
 * segment, per `SPRINT6_HANDOFF.md`), so this proxy does the same rather than a dynamic route.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ success: false, message: 'Missing jobId' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return NextResponse.json({ success: false, message: 'Backend API is not configured' }, { status: 500 });
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ success: false, message: 'Missing authorization' }, { status: 401 });
  }

  const fileRes = await fetch(`${apiBase}/api/workspaces/current/export/file?jobId=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    cache: 'no-store',
    // Never let an upstream redirect send this server-held bearer token to another host.
    redirect: 'manual',
  });

  if (!fileRes.ok || !fileRes.body) {
    const errorText = await fileRes.text().catch(() => '');
    let errorBody: Record<string, unknown> = { success: false, message: 'Failed to fetch export file' };
    try {
      if (errorText) errorBody = JSON.parse(errorText);
    } catch {
      // non-JSON body — keep the generic fallback, raw text is logged below for diagnosis
    }
    console.error(`[export-file-proxy] file fetch failed jobId=${jobId} status=${fileRes.status} body=${errorText.slice(0, 500)}`);
    return NextResponse.json(errorBody, {
      status: fileRes.status || 502,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const contentDisposition = fileRes.headers.get('content-disposition');
  const contentLength = fileRes.headers.get('content-length');
  return new NextResponse(fileRes.body, {
    headers: {
      'Content-Type': fileRes.headers.get('content-type') ?? 'application/zip',
      'Cache-Control': 'private, no-store',
      ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      ...(contentLength ? { 'Content-Length': contentLength } : {}),
    },
  });
}
