/**
 * Feature: account appearance (theme preference)
 * Tests: AppearanceTab — shows the saved choice, applies a theme at once, saves it to the account, keeps the dark
 * style on this device, and reports a failed save.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUpdateProfile = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: { updateProfile: (...args: unknown[]) => mockUpdateProfile(...args) },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

import { AppearanceTab } from '@/components/settings/AppearanceTab';
import { DARK_VARIANT_KEY, THEME_KEY } from '@/lib/theme';

function renderTab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AppearanceTab />
    </QueryClientProvider>,
  );
}

describe('AppearanceTab', () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset();
    mockToast.mockReset();
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-dark');
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.history.pushState({}, '', '/settings');
  });

  it('shows System and Slate selected when nothing is saved', () => {
    renderTab();
    expect(screen.getByRole('radio', { name: /^System/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Slate/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows the choice saved on this device', async () => {
    window.localStorage.setItem(THEME_KEY, 'dark');
    window.localStorage.setItem(DARK_VARIANT_KEY, 'dimmed');
    renderTab();
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Dark/ })).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('radio', { name: /^Dimmed/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('picking Dark applies it immediately, stores it and saves it to the account', async () => {
    mockUpdateProfile.mockResolvedValue({});
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ theme: 'dark' }));
  });

  it('picking Light removes the dark attributes', async () => {
    mockUpdateProfile.mockResolvedValue({});
    window.localStorage.setItem(THEME_KEY, 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    renderTab();
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Dark/ })).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ theme: 'light' }));
  });

  it('the dark style is applied and kept on this device only (no account save)', async () => {
    window.localStorage.setItem(THEME_KEY, 'dark');
    renderTab();
    await waitFor(() => expect(screen.getByRole('radio', { name: /^Dark/ })).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(screen.getByRole('radio', { name: /^Midnight/ }));
    expect(window.localStorage.getItem(DARK_VARIANT_KEY)).toBe('midnight');
    expect(document.documentElement.getAttribute('data-dark')).toBe('midnight');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('keeps the change on this device but says so when the account save fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('500'));
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('could not be saved to your account'), 'error'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('clicking the already-selected theme does nothing', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
