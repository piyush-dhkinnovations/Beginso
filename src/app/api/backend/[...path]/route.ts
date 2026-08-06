import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/sessionCookie';

const SESSION_PATH = 'api/auth/session';
const LOGOUT_PATH = 'api/auth/logout';
const ALLOWED_API_ROOTS = new Set([
  'auth',
  'dashboard',
  'forms',
  'responses',
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
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!isSessionRequest && !isLogoutRequest && !sessionToken) {
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
