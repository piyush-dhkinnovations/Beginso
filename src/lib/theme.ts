// The user's colour-theme preference. `light` / `dark` are explicit; `system` follows the OS and its live changes.
// The chosen value is saved on the account (PATCH /api/users/me { theme }) so it follows the person across devices, and
// mirrored in localStorage so the blocking script in app/layout.tsx can apply it before first paint (no white flash).
// The dark STYLE (Slate / Midnight / Dimmed, the design system's three dark palettes) has no backend field: it is a
// per-device choice, kept only in localStorage. So are the LIGHT style (Classic / Paper / Mist) and the TEXT SIZE
// (Default / Large / Extra large), with the same keys pattern (`beginso.<name>`) and the same way of applying them: an
// attribute on <html> (`data-dark`, `data-light`, `data-text`), set by the blocking script in app/layout.tsx before first paint.
export type ThemePreference = 'system' | 'light' | 'dark';
export type DarkVariant = 'slate' | 'midnight' | 'dimmed';
export type LightVariant = 'classic' | 'paper' | 'mist';
export type TextSize = 'default' | 'large' | 'xlarge';

export const THEME_KEY = 'beginso.theme';
export const DARK_VARIANT_KEY = 'beginso.darkVariant';
export const LIGHT_VARIANT_KEY = 'beginso.lightVariant';
export const TEXT_SIZE_KEY = 'beginso.textSize';

export const isThemePreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';
export const isDarkVariant = (v: unknown): v is DarkVariant => v === 'slate' || v === 'midnight' || v === 'dimmed';
export const isLightVariant = (v: unknown): v is LightVariant => v === 'classic' || v === 'paper' || v === 'mist';
export const isTextSize = (v: unknown): v is TextSize => v === 'default' || v === 'large' || v === 'xlarge';

/** The share of the browser's own default text size each choice means. The page's root size is set to it (see beginso-ui.css). */
export const TEXT_SCALE: Record<TextSize, number> = { default: 1, large: 1.125, xlarge: 1.25 };

/** The signed-in app. The public form (/f, /r), the form preview and the marketing and sign-in pages keep their own size for everyone. */
export const APP_PATH = /^\/(dashboard|exports|form-responses|forms|inbox|insights|my-submissions|notifications|search|settings|shared|templates|trash|workspaces|w)(\/|$)/;

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

export function readLightVariant(): LightVariant {
  const v = read(LIGHT_VARIANT_KEY);
  return isLightVariant(v) ? v : 'classic';
}

export function readTextSize(): TextSize {
  const v = read(TEXT_SIZE_KEY);
  return isTextSize(v) ? v : 'default';
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not saved on this device; the page that is open still has it.
  }
}

export const storeLightVariant = (variant: LightVariant): void => write(LIGHT_VARIANT_KEY, variant);
export const storeTextSize = (size: TextSize): void => write(TEXT_SIZE_KEY, size);

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
export function applyTheme(preference: ThemePreference, variant: DarkVariant, light: LightVariant = readLightVariant()): void {
  // Public form pages (/f, /r) and the embedded preview are styled by the form's own theme, never the viewer's.
  if (/^\/(f|r)(\/|$)/.test(window.location.pathname)) return;
  const root = document.documentElement;
  if (resolvesDark(preference)) {
    root.setAttribute('data-theme', 'dark');
    if (variant === 'slate') root.removeAttribute('data-dark');
    else root.setAttribute('data-dark', variant);
    root.removeAttribute('data-light');
  } else {
    root.removeAttribute('data-theme');
    root.removeAttribute('data-dark');
    // The light style applies only while the page is light; Classic is the base tokens, so it is no attribute at all.
    if (light === 'classic') root.removeAttribute('data-light');
    else root.setAttribute('data-light', light);
  }
}

/** Sets the text size attribute (`data-text`) on <html>, in the signed-in app only. Mirrors the inline script in app/layout.tsx. */
export function applyTextSize(size: TextSize): void {
  const path = window.location.pathname;
  const root = document.documentElement;
  if (!APP_PATH.test(path) || (/^\/forms\/[^/]+\/preview$/.test(path) && /[?&]embed=1/.test(window.location.search))) {
    root.removeAttribute('data-text');
    return;
  }
  if (size === 'default') root.removeAttribute('data-text');
  else root.setAttribute('data-text', size);
}
