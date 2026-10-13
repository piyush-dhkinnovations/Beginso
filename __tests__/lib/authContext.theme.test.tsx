/**
 * Feature: account appearance (theme preference)
 * Tests: AuthProvider adopts the theme saved on the account when it differs from this device, and leaves a matching
 * device alone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock('@/store/recentFormsStore', () => ({ bindRecentFormsUser: vi.fn() }));

const probeSession = vi.fn();
vi.mock('@/services/auth', () => ({
  authService: {
    prepareFirebase: vi.fn().mockResolvedValue(undefined),
    probeSession: (...args: unknown[]) => probeSession(...args),
    getMe: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AuthProvider } from '@/lib/authContext';
import { THEME_KEY } from '@/lib/theme';

const user = (theme?: string) => ({ user: { id: 'u1', name: 'A', email: 'a@b.c', onboardingCompleted: true, ...(theme ? { theme } : {}) } });

describe('AuthProvider theme sync', () => {
  beforeEach(() => {
    probeSession.mockReset();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-dark');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.history.pushState({}, '', '/dashboard');
  });

  it("applies and stores the account's saved theme when this device has a different one", async () => {
    window.localStorage.setItem(THEME_KEY, 'light');
    probeSession.mockResolvedValue(user('dark'));
    render(<AuthProvider>x</AuthProvider>);
    await waitFor(() => expect(document.documentElement.getAttribute('data-theme')).toBe('dark'));
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('does nothing when the device already matches the account', async () => {
    window.localStorage.setItem(THEME_KEY, 'light');
    probeSession.mockResolvedValue(user('light'));
    render(<AuthProvider>x</AuthProvider>);
    await waitFor(() => expect(probeSession).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignores a missing or unknown saved theme (older server)', async () => {
    window.localStorage.setItem(THEME_KEY, 'dark');
    probeSession.mockResolvedValue(user('purple'));
    render(<AuthProvider>x</AuthProvider>);
    await waitFor(() => expect(probeSession).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});
