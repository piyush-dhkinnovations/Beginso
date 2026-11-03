/**
 * Feature: account appearance (theme preference)
 * Tests: AppearanceTab — shows the saved choice, applies a theme at once, saves it to the account, keeps the dark
 * style on this device, and reports a failed save.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
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

  const device = (dark: boolean) => vi.stubGlobal('matchMedia', () => ({ matches: dark, addEventListener() {}, removeEventListener() {} }));

  it('shows System and the default style of the device\'s mode selected when nothing is saved', async () => {
    renderTab();
    expect(screen.getByRole('radio', { name: /^System/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Classic/ })).toHaveAttribute('aria-checked', 'true');
    cleanup();
    device(true);
    renderTab();
    await waitFor(() => expect(radios(/^Slate/)).toHaveAttribute('aria-checked', 'true'));
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

  it('System looks at the device: in light mode only the light styles show, with a note that the dark style is kept', () => {
    renderTab();
    expect(radios(/^Classic/)).toBeInTheDocument();
    expect(radios(/^Slate/)).toBeNull();
    expect(screen.getByText(/Used while your device is in light mode/)).toBeInTheDocument();
    expect(screen.getByText(/Your device is in light mode right now, so these are the light styles\. Your dark style is kept/)).toBeInTheDocument();
    expect(screen.queryByText(/Used while your device is in dark mode/)).not.toBeInTheDocument();
  });

  it('System in dark mode shows only the dark styles', async () => {
    device(true);
    renderTab();
    await waitFor(() => expect(radios(/^Slate/)).toBeInTheDocument());
    expect(radios(/^Midnight/)).toBeInTheDocument();
    expect(radios(/^Classic/)).toBeNull();
    expect(screen.getByText(/Used while your device is in dark mode/)).toBeInTheDocument();
    expect(screen.getByText(/Your device is in dark mode right now, so these are the dark styles/)).toBeInTheDocument();
  });

  it('System follows the device while the page is open: the styles on screen change when the device switches mode', async () => {
    let listener: ((e: { matches: boolean }) => void) | undefined;
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: (_: string, fn: typeof listener) => (listener = fn), removeEventListener() {} }));
    renderTab();
    expect(radios(/^Classic/)).toBeInTheDocument();
    act(() => listener!({ matches: true }));
    expect(radios(/^Slate/)).toBeInTheDocument();
    expect(radios(/^Classic/)).toBeNull();
    act(() => listener!({ matches: false }));
    expect(radios(/^Classic/)).toBeInTheDocument();
  });

  it('Light and Dark never show the device note', () => {
    renderTab();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    expect(screen.queryByText(/right now/)).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    fireEvent.click(radios(/^Midnight/)!);
    expect(radios(/^Paper/)).toBeNull();
    expect(radios(/^Midnight/)).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: /^Light/ }));
    expect(radios(/^Paper/)).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-light')).toBe('paper');
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }));
    // the device is in light mode: the light choice shows, the dark choice is kept out of sight
    expect(radios(/^Paper/)).toHaveAttribute('aria-checked', 'true');
    expect(radios(/^Midnight/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
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
    fireEvent.click(screen.getByRole('radio', { name: /^Dark/ }));
    fireEvent.click(radios(/^Midnight/)!);
    fireEvent.click(screen.getByRole('radio', { name: /^System/ }));
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
    // Light shows the light choice, Dark the dark one, System the one for the mode the device is in (light here)
    if (theme !== 'dark') expect(radios(new RegExp(`^${light}`, 'i'))).toHaveAttribute('aria-checked', 'true');
    if (theme === 'dark') expect(radios(new RegExp(`^${dark}`, 'i'))).toHaveAttribute('aria-checked', 'true');
    if (theme !== 'dark') expect(radios(new RegExp(`^${dark}`, 'i'))).toBeNull();
    expect(screen.getByRole('radio', { name: /^Large/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('Text size: three boxes in one radio group, Default selected, each drawn at its own size, and a note that it is saved on this device only', () => {
    renderTab();
    expect(screen.getByRole('radiogroup', { name: 'Text size' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Default/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /^Large/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /^Extra large/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getAllByText('Your forms')).toHaveLength(3);
    expect(screen.getByText(/Makes text, buttons and spacing bigger/)).toHaveTextContent('Saved on this device only');
  });

  it('Text size: every box shows its own real size (16px, 18px, 20px) at once, whatever size the page is at now and whichever is chosen', () => {
    renderTab();
    const sizes = () => screen.getAllByText('Your forms').map((n) => (n.parentElement as HTMLElement).style.fontSize);
    expect(sizes()).toEqual(['16px', '18px', '20px']);
    fireEvent.click(screen.getByRole('radio', { name: /^Extra large/ }));
    expect(sizes()).toEqual(['16px', '18px', '20px']);
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
