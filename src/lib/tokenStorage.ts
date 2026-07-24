const TOKEN_KEY = 'auth_token';
// Edge middleware (src/proxy.ts) only needs to know "is someone logged in", never the
// real token — so it gets a value-less marker cookie instead of a second script-readable
// copy of the bearer token. Real fix is backend-issued httpOnly session cookies; tracked
// in docs/backend-contract/api-reference.md until the backend contract supports it.
const SESSION_MARKER_KEY = 'has_session';

export function saveToken(token: string): void {
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // SecurityError / QuotaExceededError -> silent
  }
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${SESSION_MARKER_KEY}=1; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

export function getToken(): string | null {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
  } catch {
    // silent
  }
  return null;
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // silent
  }
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${SESSION_MARKER_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

