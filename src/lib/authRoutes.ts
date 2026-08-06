export const PROTECTED_PATHS = ['/dashboard', '/forms', '/templates', '/responses', '/analytics', '/reports', '/settings'];
export const AUTH_PATHS = ['/login', '/signup'];

export function matchesRoute(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
