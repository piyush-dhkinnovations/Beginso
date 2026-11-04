/**
 * Feature: account appearance (theme preference)
 * Tests: lib/theme — reading/storing the saved choice, and the attributes applyTheme sets.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyTextSize,
  applyTheme,
  readDarkVariant,
  readLightVariant,
  readTextSize,
  readThemePreference,
  resolvesDark,
  storeLightVariant,
  storeTextSize,
  storeTheme,
  storeThemeCookie,
  THEME_COOKIE,
  TEXT_SCALE,
  THEME_KEY,
  DARK_VARIANT_KEY,
  LIGHT_VARIANT_KEY,
  TEXT_SIZE_KEY,
} from '@/lib/theme';

function mockOsDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark && q.includes('dark'), addEventListener() {}, removeEventListener() {} }));
}

describe('theme preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-dark');
    document.documentElement.removeAttribute('data-light');
    document.documentElement.removeAttribute('data-text');
    mockOsDark(false);
    window.history.pushState({}, '', '/settings');
  });

  it('defaults to system / slate when nothing is saved or the saved value is not valid', () => {
    expect(readThemePreference()).toBe('system');
    expect(readDarkVariant()).toBe('slate');
    window.localStorage.setItem(THEME_KEY, 'purple');
    window.localStorage.setItem(DARK_VARIANT_KEY, 'neon');
    expect(readThemePreference()).toBe('system');
    expect(readDarkVariant()).toBe('slate');
  });

  it('also keeps a cookie copy of the choice, which the first paint falls back on when nothing is saved on the device', () => {
    document.cookie = `${THEME_COOKIE}=; Max-Age=0; Path=/`;
    storeTheme('dark', 'slate');
    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
    storeThemeCookie('system');
    expect(document.cookie).toContain(`${THEME_COOKIE}=system`);
  });

  it('stores and reads back the choice', () => {
    storeTheme('dark', 'midnight');
    expect(readThemePreference()).toBe('dark');
    expect(readDarkVariant()).toBe('midnight');
  });

  it('system resolves to the OS setting; light and dark ignore it', () => {
    mockOsDark(true);
    expect(resolvesDark('system')).toBe(true);
    expect(resolvesDark('light')).toBe(false);
    mockOsDark(false);
    expect(resolvesDark('system')).toBe(false);
    expect(resolvesDark('dark')).toBe(true);
  });

  it('dark sets data-theme, plus data-dark for the non-default styles', () => {
    applyTheme('dark', 'slate');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-dark')).toBe(false);
    applyTheme('dark', 'dimmed');
    expect(document.documentElement.getAttribute('data-dark')).toBe('dimmed');
  });

  it('light clears both attributes', () => {
    applyTheme('dark', 'midnight');
    applyTheme('light', 'midnight');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.documentElement.hasAttribute('data-dark')).toBe(false);
  });

  it('never themes a public form page', () => {
    window.history.pushState({}, '', '/f/some-form');
    applyTheme('dark', 'slate');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('the light style and the text size default to classic / default and ignore a saved value that is not valid', () => {
    expect(readLightVariant()).toBe('classic');
    expect(readTextSize()).toBe('default');
    window.localStorage.setItem(LIGHT_VARIANT_KEY, 'neon');
    window.localStorage.setItem(TEXT_SIZE_KEY, 'huge');
    expect(readLightVariant()).toBe('classic');
    expect(readTextSize()).toBe('default');
  });

  it('stores and reads back the light style and the text size, under the same key pattern as the theme', () => {
    storeLightVariant('paper');
    storeTextSize('xlarge');
    expect(window.localStorage.getItem('beginso.lightVariant')).toBe('paper');
    expect(window.localStorage.getItem('beginso.textSize')).toBe('xlarge');
    expect(readLightVariant()).toBe('paper');
    expect(readTextSize()).toBe('xlarge');
  });

  it('light: Classic is no attribute; Paper and Mist are data-light, and only while the page is light', () => {
    applyTheme('light', 'slate', 'classic');
    expect(document.documentElement.hasAttribute('data-light')).toBe(false);
    applyTheme('light', 'slate', 'paper');
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
    applyTheme('light', 'slate', 'mist');
    expect(document.documentElement.getAttribute('data-light')).toBe('mist');
    applyTheme('dark', 'midnight', 'mist');
    expect(document.documentElement.hasAttribute('data-light')).toBe(false);
    expect(document.documentElement.getAttribute('data-dark')).toBe('midnight');
  });

  it('system follows the device: the light style in light mode, the dark style in dark mode, with the saved choice for each', () => {
    mockOsDark(false);
    applyTheme('system', 'dimmed', 'paper');
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    mockOsDark(true);
    applyTheme('system', 'dimmed', 'paper');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-dark')).toBe('dimmed');
    expect(document.documentElement.hasAttribute('data-light')).toBe(false);
  });

  it('applyTheme reads the saved light style when it is not given one', () => {
    storeLightVariant('mist');
    applyTheme('light', 'slate');
    expect(document.documentElement.getAttribute('data-light')).toBe('mist');
  });

  it('the text size is data-text in the signed-in app: large and xlarge set it, default clears it', () => {
    window.history.pushState({}, '', '/forms');
    applyTextSize('large');
    expect(document.documentElement.getAttribute('data-text')).toBe('large');
    applyTextSize('xlarge');
    expect(document.documentElement.getAttribute('data-text')).toBe('xlarge');
    applyTextSize('default');
    expect(document.documentElement.hasAttribute('data-text')).toBe(false);
  });

  it('the text size never reaches the public form, its preview, the marketing pages or the sign-in pages', () => {
    for (const path of ['/f/some-form', '/r/some-form', '/', '/login', '/blog', '/terms', '/forms/abc/preview?embed=1']) {
      document.documentElement.setAttribute('data-text', 'xlarge');
      window.history.pushState({}, '', path);
      applyTextSize('xlarge');
      expect(document.documentElement.hasAttribute('data-text'), path).toBe(false);
    }
    window.history.pushState({}, '', '/w/my-team/forms');
    applyTextSize('large');
    expect(document.documentElement.getAttribute('data-text')).toBe('large');
  });

  it('the text sizes are 100%, 112.5% and 125% of the browser size', () => {
    expect(TEXT_SCALE).toEqual({ default: 1, large: 1.125, xlarge: 1.25 });
  });

  it('survives storage being blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readThemePreference()).toBe('system');
    expect(() => storeTheme('dark', 'slate')).not.toThrow();
    vi.restoreAllMocks();
  });
});
