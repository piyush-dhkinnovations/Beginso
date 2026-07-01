const TOKEN_KEY = 'auth_token';

export function saveToken(token: string): void {
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // SecurityError / QuotaExceededError -> silent
  }
  // Cookie sync for Edge middleware
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; Secure`;
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
  // Remove cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
}
