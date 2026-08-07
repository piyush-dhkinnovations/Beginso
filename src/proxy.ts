import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_PATHS, PROTECTED_PATHS, matchesRoute } from '@/lib/authRoutes';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

async function hasValidSession(token: string): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return false;

  try {
    const response = await fetch(new URL('/api/auth/me', apiBase), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    // Fail closed when the session cannot be verified.
    return false;
  }
}

function clearInvalidSession(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isProtected = matchesRoute(pathname, PROTECTED_PATHS);
  const isAuthPage = matchesRoute(pathname, AUTH_PATHS);
  const sessionIsValid = token ? await hasValidSession(token) : false;

  // A cookie's presence is not trusted: the backend must validate its JWT first.
  if (isProtected && !sessionIsValid) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    return token ? clearInvalidSession(response) : response;
  }

  if (isAuthPage && sessionIsValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const response = NextResponse.next();
  return token && !sessionIsValid ? clearInvalidSession(response) : response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/forms/:path*',
    '/templates/:path*',
    '/responses/:path*',
    '/analytics/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
    '/verify-email',
    '/verification-code',
    '/forgot-password',
    '/reset-password'
  ],
};
