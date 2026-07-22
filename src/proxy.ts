import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/forms', '/templates', '/responses', '/analytics', '/reports', '/settings'];
const AUTH_PATHS = ['/login', '/signup'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Presence-only marker, not the real bearer token — see src/lib/tokenStorage.ts.
  const token = request.cookies.get('has_session')?.value ?? null;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Redirect to login if trying to access protected route without token
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
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
    '/signup'
  ],
};
