import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/sessionCookie';

const SESSION_PATH = 'api/auth/session';
const LOGOUT_PATH = 'api/auth/logout';
const PUBLIC_AUTH_PATHS = new Set([
  SESSION_PATH,
  LOGOUT_PATH,
  'api/auth/email-verification',
  'api/auth/email-verification/reveal',
  'api/auth/email-verification/verify',
  'api/auth/forgot-password',
  'api/auth/confirm-password-reset',
]);
const ALLOWED_API_ROOTS = new Set([
  'auth',
  'analytics',
  'dashboard',
  'forms',
  // Sprint 9 (team-permissions, task 2.2) — the public/token-based invitation routes
  // (GET/POST /api/invitations/:token/...) live under their own root, not /workspaces, so
  // they need their own allowlist entry (CLAUDE.md's named trap: without this every call
  // 404s through the BFF regardless of whether the backend route exists).
  'invitations',
  'notifications',
  'reports',
  'responses',
  // Sprint 9 (team-permissions, task 5.4) — GET /api/shared-with-me lives under its own root
  // segment (not /workspaces or /forms), same allowlist trap named above for 'invitations':
  // design.md §2 only flagged 'invitations' as the one addition needed this sprint, but missed
  // this one — found by inspection while wiring sharedService, fixed here rather than left to
  // 404 silently once the backend route ships.
  'shared-with-me',
  'templates',
  'upload',
  'users',
  'workspaces',
]);

function isAllowedBackendPath(pathParts: string[]): boolean {
  if (pathParts.length < 2 || pathParts[0] !== 'api' || !ALLOWED_API_ROOTS.has(pathParts[1])) {
    return false;
  }

  return pathParts.every(
    (part) =>
      part.length > 0 &&
      part !== '.' &&
      part !== '..' &&
      !part.includes('/') &&
      !part.includes('\\')
  );
}

function deleteSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

async function forward(request: NextRequest, pathParts: string[]): Promise<NextResponse> {
  if (!isAllowedBackendPath(pathParts)) {
    return NextResponse.json({ message: 'Backend path is not allowed' }, { status: 404 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) {
    return NextResponse.json({ message: 'Backend API is not configured' }, { status: 500 });
  }

  const path = pathParts.join('/');
  const isSessionRequest = path === SESSION_PATH;
  const isLogoutRequest = path === LOGOUT_PATH;
  const isPublicAuthRequest = PUBLIC_AUTH_PATHS.has(path);
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!isPublicAuthRequest && !sessionToken) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
  }

  if (isLogoutRequest && !sessionToken) {
    const response = new NextResponse(null, { status: 204 });
    deleteSessionCookie(response);
    return response;
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
    }
  }

  const backendUrl = new URL(`/${path}`, apiBase);
  backendUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);
  if (sessionToken) headers.set('authorization', `Bearer ${sessionToken}`);

  // Real bug found and fixed: this proxy builds a fresh Headers object for the upstream request
  // and, until now, only ever copied the fixed list below it — silently dropping every other
  // header the browser sent, including x-workspace-slug/x-workspace-id. formsService.getForms()
  // (src/services/forms.ts) started sending x-workspace-slug to fix forms leaking across
  // personal/workspace contexts, but that fix was a no-op end-to-end: the header never survived
  // this hop, so the real backend never received it regardless of what axios sent. Forwarded here
  // — these are the exact two headers API_CONTRACT.md's "Workspace Resolution" order names as its
  // first, highest-priority mechanism, so any current or future caller relying on them needs this
  // proxy to actually pass them through, not just the one caller that happened to need it first.
  const workspaceSlug = request.headers.get('x-workspace-slug');
  const workspaceId = request.headers.get('x-workspace-id');
  if (workspaceSlug) headers.set('x-workspace-slug', workspaceSlug);
  if (workspaceId) headers.set('x-workspace-id', workspaceId);

  // This route runs server-side (Node fetch on Vercel), so without these the backend sees
  // Vercel's outbound AWS IP and User-Agent "node" instead of the real visitor's — see backend's
  // 8fc966a fix notes. x-forwarded-for's first hop is the original client, set by Vercel's edge
  // before this function runs.
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  const clientUserAgent = request.headers.get('user-agent');
  if (clientIp) headers.set('x-client-ip', clientIp);
  // The backend only believes x-client-ip when this shared secret comes with it (anyone can send
  // the header). Same value as PROXY_SHARED_SECRET on the backend; unset here = backend uses the
  // proxy's own address for rate limits and login location.
  const proxySecret = process.env.BACKEND_PROXY_SECRET;
  if (proxySecret) headers.set('x-proxy-secret', proxySecret);
  if (clientUserAgent) headers.set('x-client-user-agent', clientUserAgent);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstream = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });

    if (isSessionRequest && upstream.ok) {
      const payload = (await upstream.json()) as Record<string, unknown>;
      const token = payload.token;
      if (typeof token !== 'string' || token.length === 0) {
        return NextResponse.json({ message: 'Backend did not issue a session token' }, { status: 502 });
      }

      delete payload.token;
      const response = NextResponse.json(payload, { status: upstream.status });
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      });
      response.headers.set('cache-control', 'no-store');
      return response;
    }

    const responseHeaders = new Headers({ 'cache-control': 'no-store' });
    const upstreamContentType = upstream.headers.get('content-type');
    const contentDisposition = upstream.headers.get('content-disposition');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    if (contentDisposition) responseHeaders.set('content-disposition', contentDisposition);

    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    if (isLogoutRequest || upstream.status === 401) deleteSessionCookie(response);
    return response;
  } catch {
    const response = NextResponse.json({ message: 'Backend service is unavailable' }, { status: 502 });
    if (isLogoutRequest) deleteSessionCookie(response);
    return response;
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forward(request, (await context.params).path);
}
