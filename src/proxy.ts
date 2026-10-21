import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_PATHS, PROTECTED_PATHS, matchesRoute } from '@/lib/authRoutes';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

// 'unknown' = the backend could not answer (server error, rate limit, network). That says nothing about the session, so it
// must neither bounce the person to /login nor delete their cookie: the page loads, and the app's own session check
// retries and shows a "try again" screen. Real data is still protected by the backend on every call.
type SessionCheck = 'valid' | 'invalid' | 'unknown';

async function checkSession(token: string): Promise<SessionCheck> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return 'unknown';

  try {
    const response = await fetch(new URL('/api/auth/me', apiBase), {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (response.ok) return 'valid';
    return response.status === 401 || response.status === 403 ? 'invalid' : 'unknown';
  } catch {
    return 'unknown';
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
  const check: SessionCheck = token ? await checkSession(token) : 'invalid';
  const sessionIsValid = check === 'valid';
  const sessionIsUnknown = check === 'unknown';

  // A cookie's presence is not trusted: the backend must validate its JWT first.
  if (isProtected && !sessionIsValid && !sessionIsUnknown) {
    // Keep the destination so login()/LoginForm can return the user here (sanitizeNextParam re-validates it there).
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search);
    const response = NextResponse.redirect(loginUrl);
    return token ? clearInvalidSession(response) : response;
  }

  if (isAuthPage && sessionIsValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Legacy redirect: /inbox/<id>?scope=<workspace-slug> → /w/<slug>/inbox/<id>?<rest>
  // Old links (notifications, emails, activity) used ?scope= on the personal-inbox route;
  // the workspace-scoped route now carries the slug in the URL so the right shell renders.
  // Runs after the auth check so unauthenticated users get /login first (with the original
  // URL preserved in ?next=, then this redirect fires on the way back in).
  const inboxIdMatch = pathname.match(/^\/inbox\/([^/]+)$/);
  if (inboxIdMatch) {
    const scope = request.nextUrl.searchParams.get('scope');
    if (scope && scope !== 'personal') {
      const newUrl = new URL(`/w/${scope}/inbox/${inboxIdMatch[1]}`, request.url);
      for (const [k, v] of request.nextUrl.searchParams.entries()) {
        if (k !== 'scope') newUrl.searchParams.set(k, v);
      }
      return NextResponse.redirect(newUrl, { status: 308 });
    }
  }

  const response = NextResponse.next();
  return token && !sessionIsValid && !sessionIsUnknown ? clearInvalidSession(response) : response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/forms/:path*',
    '/templates/:path*',
    '/inbox/:path*',
    '/insights/:path*',
    '/exports/:path*',
    '/responses/:path*',
    '/form-responses/:path*',
    '/analytics/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/w/:path*',
    '/shared/:path*',
    '/workspaces/:path*',
    '/my-submissions/:path*',
    '/trash/:path*',
    '/notifications/:path*',
    '/search/:path*',
    '/login',
    '/signup',
    '/verify-email',
    '/verification-code',
    '/forgot-password',
    '/reset-password'
  ],
};
