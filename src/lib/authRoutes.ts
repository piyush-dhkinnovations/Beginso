export const PROTECTED_PATHS = ['/dashboard', '/forms', '/templates', '/inbox', '/insights', '/exports', '/responses', '/form-responses', '/analytics', '/reports', '/settings', '/onboarding', '/w', '/shared', '/workspaces', '/my-submissions', '/trash', '/notifications', '/search'];
export const AUTH_PATHS = ['/login', '/signup', '/verify-email', '/verification-code', '/forgot-password', '/reset-password'];

export function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Sprint 9 task 3.5 / requirements §7.5.1: validates a `?next=` value is an internal path before
// it's ever handed to login()/router — a crafted `next=https://evil.example` or `next=//evil.com`
// (protocol-relative) must never be honored (design.md §14/§19's open-redirect guard).
export function sanitizeNextParam(value: string | null): string | undefined {
  return value && /^\/(?!\/)/.test(value) ? value : undefined;
}
