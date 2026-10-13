/**
 * Feature: account appearance (theme preference)
 * Tests: lib/theme — reading/storing the saved choice, and the attributes applyTheme sets.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { applyTheme, readDarkVariant, readThemePreference, resolvesDark, storeTheme, THEME_KEY, DARK_VARIANT_KEY } from '@/lib/theme';

function mockOsDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark && q.includes('dark'), addEventListener() {}, removeEventListener() {} }));
}

describe('theme preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-dark');
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
