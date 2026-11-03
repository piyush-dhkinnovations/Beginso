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
import { DARK_VARIANT_KEY, LIGHT_VARIANT_KEY, TEXT_SIZE_KEY, THEME_KEY, applyTheme, readDarkVariant, readLightVariant, readThemePreference } from '@/lib/theme';

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
    document.documentElement.removeAttribute('data-light');
    document.documentElement.removeAttribute('data-text');
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

  const radios = (name: RegExp) => screen.queryByRole('radio', { name });

  it('Light shows only the light styles', async () => {
    window.localStorage.setItem(THEME_KEY, 'light');
    renderTab();
    await waitFor(() => expect(radios(/^Classic/)).toBeInTheDocument());
    expect(radios(/^Paper/)).toBeInTheDocument();
    expect(radios(/^Mist/)).toBeInTheDocument();
    expect(radios(/^Slate/)).toBeNull();
    expect(radios(/^Midnight/)).toBeNull();
    expect(radios(/^Dimmed/)).toBeNull();
    expect(screen.getByText(/Used whenever light mode is on/)).toBeInTheDocument();
  });

  it('Dark shows only the dark styles', async () => {
    window.localStorage.setItem(THEME_KEY, 'dark');
    renderTab();
    await waitFor(() => expect(radios(/^Slate/)).toBeInTheDocument());
    expect(radios(/^Midnight/)).toBeInTheDocument();
    expect(radios(/^Classic/)).toBeNull();
    expect(radios(/^Paper/)).toBeNull();
    expect(radios(/^Mist/)).toBeNull();
    expect(screen.getByText(/Used whenever dark mode is on/)).toBeInTheDocument();
  });

  it('System shows both, each labelled for the mode of the device', async () => {
    renderTab();
    expect(radios(/^Classic/)).toBeInTheDocument();
    expect(radios(/^Slate/)).toBeInTheDocument();
    expect(screen.getByText(/Used when your device is in light mode/)).toBeInTheDocument();
    expect(screen.getByText(/Used when your device is in dark mode/)).toBeInTheDocument();
  });

  it('the sections change at once when the Theme card changes (no reload)', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    expect(radios(/^Classic/)).toBeNull();
    expect(radios(/^Slate/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    expect(radios(/^Slate/)).toBeNull();
    expect(radios(/^Paper/)).toBeInTheDocument();
  });

  it('a style choice is never lost when its section is hidden', () => {
    renderTab();
    fireEvent.click(radios(/^Paper/)!);
    fireEvent.click(radios(/^Midnight/)!);
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    expect(radios(/^Paper/)).toBeNull();
    expect(radios(/^Midnight/)).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    expect(radios(/^Paper/)).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }));
    expect(radios(/^Paper/)).toHaveAttribute('aria-checked', 'true');
    expect(radios(/^Midnight/)).toHaveAttribute('aria-checked', 'true');
  });

  it('Light applies the light style; Dark applies the dark style and clears the light one', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    fireEvent.click(radios(/^Mist/)!);
    expect(document.documentElement.getAttribute('data-light')).toBe('mist');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    fireEvent.click(radios(/^Dimmed/)!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-dark')).toBe('dimmed');
    expect(document.documentElement.hasAttribute('data-light')).toBe(false);
  });

  it('System follows the device: the light style in light mode, the dark style in dark mode', () => {
    renderTab();
    fireEvent.click(radios(/^Paper/)!);
    fireEvent.click(radios(/^Midnight/)!);
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    applyTheme(readThemePreference(), readDarkVariant(), readLightVariant());
    expect(document.documentElement.getAttribute('data-dark')).toBe('midnight');
    expect(document.documentElement.hasAttribute('data-light')).toBe(false);
  });

  it.each([
    ['system', 'paper', 'midnight'],
    ['light', 'mist', 'slate'],
    ['dark', 'classic', 'dimmed'],
  ])('with the %s theme, the choices persist after a reload (light %s, dark %s)', async (theme, light, dark) => {
    window.localStorage.setItem(THEME_KEY, theme);
    window.localStorage.setItem(LIGHT_VARIANT_KEY, light);
    window.localStorage.setItem(DARK_VARIANT_KEY, dark);
    window.localStorage.setItem(TEXT_SIZE_KEY, 'large');
    const { unmount } = renderTab();
    unmount(); // a reload: the page is gone, only what is saved on the device is left
    renderTab();
    await waitFor(() => expect(screen.getByRole('radio', { name: new RegExp(`^${theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'}`) })).toHaveAttribute('aria-checked', 'true'));
    if (theme !== 'dark') expect(radios(new RegExp(`^${light}`, 'i'))).toHaveAttribute('aria-checked', 'true');
    if (theme !== 'light') expect(radios(new RegExp(`^${dark}`, 'i'))).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Large/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('Text size: a switch with three choices, Default selected, one live preview, and a note that it is saved on this device only', () => {
    renderTab();
    expect(screen.getByRole('radiogroup', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Default/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Large/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Extra large/ })).toBeInTheDocument();
    expect(screen.getAllByText('Your forms')).toHaveLength(1);
    expect(screen.getByText(/Makes text, buttons and spacing bigger/)).toHaveTextContent('Saved on this device only');
  });

  it('Text size: the preview is drawn at the real size of the choice (16px, 18px, 20px), whatever size the page is at now', () => {
    renderTab();
    const size = () => (screen.getByText('Your forms').parentElement as HTMLElement).style.fontSize;
    expect(size()).toBe('16px');
    fireEvent.click(screen.getByRole('radio', { name: /^Large/ }));
    expect(size()).toBe('18px');
    fireEvent.click(screen.getByRole('radio', { name: /^Extra large/ }));
    expect(size()).toBe('20px');
  });

  it('Text size: choosing one applies it at once, saves it on this device only, and Default clears it', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Extra large/ }));
    expect(document.documentElement.getAttribute('data-text')).toBe('xlarge');
    expect(window.localStorage.getItem(TEXT_SIZE_KEY)).toBe('xlarge');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /^Default/ }));
    expect(document.documentElement.hasAttribute('data-text')).toBe(false);
    expect(window.localStorage.getItem(TEXT_SIZE_KEY)).toBe('default');
  });

  it('the choices are one radio group for the keyboard: arrows move and choose, Tab lands on the chosen one', () => {
    renderTab();
    const large = screen.getByRole('radio', { name: /^Large/ });
    const def = screen.getByRole('radio', { name: /^Default/ });
    expect(def).toHaveAttribute('tabindex', '0');
    expect(large).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(def, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: /^Large/ })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-text')).toBe('large');
    fireEvent.keyDown(screen.getByRole('radio', { name: /^Large/ }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: /^Default/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(screen.getByRole('radio', { name: /^Default/ }), { key: 'ArrowLeft' }); // wraps to the last
    expect(screen.getByRole('radio', { name: /^Extra large/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('the colour swatches are a radio group too: arrows move and choose', () => {
    renderTab();
    fireEvent.keyDown(screen.getByRole('radio', { name: /^Classic/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: /^Paper/ })).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
  });

  it('the chosen text size and the chosen colour style have a check mark, not colour alone', () => {
    renderTab();
    expect(screen.getByRole('radio', { name: /^Default/ }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('radio', { name: /^Large/ }).querySelector('svg')).toBeNull();
    expect(screen.getByRole('radio', { name: /^Classic/ }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('radio', { name: /^Paper/ }).querySelector('svg')).toBeNull();
  });

  it('says in words what the theme means right now, naming the colours it will use', () => {
    renderTab();
    expect(screen.getByText('Follows your device: Classic in light mode, Slate in dark mode.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Paper/ }));
    expect(screen.getByText('Always light, using Paper.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    expect(screen.getByText('Always dark, using Slate.')).toBeInTheDocument();
  });

  it('clicking the already-selected theme does nothing', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
