// The user's colour-theme preference. `light` / `dark` are explicit; `system` follows the OS and its live changes.
// The chosen value is saved on the account (PATCH /api/users/me { theme }) so it follows the person across devices, and
// mirrored in localStorage so the blocking script in app/layout.tsx can apply it before first paint (no white flash).
// The dark STYLE (Slate / Midnight / Dimmed, the design system's three dark palettes) has no backend field: it is a
// per-device choice, kept only in localStorage.
export type ThemePreference = 'system' | 'light' | 'dark';
export type DarkVariant = 'slate' | 'midnight' | 'dimmed';

export const THEME_KEY = 'beginso.theme';
export const DARK_VARIANT_KEY = 'beginso.darkVariant';

export const isThemePreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';
export const isDarkVariant = (v: unknown): v is DarkVariant => v === 'slate' || v === 'midnight' || v === 'dimmed';

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // storage blocked (private mode, disabled cookies): fall back to the defaults
  }
}

export function readThemePreference(): ThemePreference {
  const v = read(THEME_KEY);
  return isThemePreference(v) ? v : 'system';
}

export function readDarkVariant(): DarkVariant {
  const v = read(DARK_VARIANT_KEY);
  return isDarkVariant(v) ? v : 'slate';
}

export function storeTheme(preference: ThemePreference, variant: DarkVariant): void {
  try {
    window.localStorage.setItem(THEME_KEY, preference);
    window.localStorage.setItem(DARK_VARIANT_KEY, variant);
  } catch {
    // Not saved on this device; the account copy (and the current page) still apply.
  }
}

/** True when the page is (or would be) dark for this preference. */
export function resolvesDark(preference: ThemePreference): boolean {
  return preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

/** Sets the attributes the design system's tokens key off. Mirrors the inline script in app/layout.tsx. */
export function applyTheme(preference: ThemePreference, variant: DarkVariant): void {
  // Public form pages (/f, /r) and the embedded preview are styled by the form's own theme, never the viewer's.
  if (/^\/(f|r)(\/|$)/.test(window.location.pathname)) return;
  const root = document.documentElement;
  if (resolvesDark(preference)) {
    root.setAttribute('data-theme', 'dark');
    if (variant === 'slate') root.removeAttribute('data-dark');
    else root.setAttribute('data-dark', variant);
  } else {
    root.removeAttribute('data-theme');
    root.removeAttribute('data-dark');
  }
}
