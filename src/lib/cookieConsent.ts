export type CookieChoice = 'all' | 'essential';

const KEY = 'beginso.cookie-consent';
const COOKIE = 'beginso_cookie_consent';
/** Fired when the choice is saved, and by "Cookie settings" to ask for the banner again. */
export const COOKIE_CHANGE_EVENT = 'beginso:cookie-consent';
export const COOKIE_REOPEN_EVENT = 'beginso:cookie-settings';

const isChoice = (v: unknown): v is CookieChoice => v === 'all' || v === 'essential';

/** The saved choice, or null when the person has not chosen yet (or the browser will not let us read storage). */
export function readCookieConsent(): CookieChoice | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    if (isChoice(stored?.choice)) return stored.choice;
  } catch {
    /* storage blocked or unreadable: fall back to the cookie */
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(all|essential)`));
  return match ? (match[1] as CookieChoice) : null;
}

/** Saves the choice in the browser: local storage (with the date) and a one-year first-party cookie, so it survives either being cleared. */
export function saveCookieConsent(choice: CookieChoice): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ choice, savedAt: new Date().toISOString() }));
  } catch {
    /* private window or blocked storage: the cookie below still remembers it */
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(COOKIE_CHANGE_EVENT));
}
