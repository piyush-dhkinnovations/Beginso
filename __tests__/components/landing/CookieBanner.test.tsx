import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CookieBanner } from '@/components/landing/CookieBanner';
import { CookieSettingsButton } from '@/components/landing/CookieSettingsButton';
import { readCookieConsent } from '@/lib/cookieConsent';

const clearCookie = () => {
  document.cookie = 'beginso_cookie_consent=; Max-Age=0; Path=/';
};

beforeEach(() => {
  window.localStorage.clear();
  clearCookie();
});

describe('CookieBanner', () => {
  it('asks on the first visit, with a link to the Cookie Policy', () => {
    render(<CookieBanner />);
    expect(screen.getByRole('region', { name: 'Cookies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Allow all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Essential only' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute('href', '/cookie-policy');
  });

  it('"Allow all" saves the choice in local storage (with the date) and in a one-year cookie, and closes the bar', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Allow all' }));
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem('beginso.cookie-consent')!);
    expect(stored.choice).toBe('all');
    expect(Number.isNaN(Date.parse(stored.savedAt))).toBe(false);
    expect(document.cookie).toContain('beginso_cookie_consent=all');
    expect(readCookieConsent()).toBe('all');
  });

  it('"Essential only" saves that choice', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(readCookieConsent()).toBe('essential');
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
  });

  it('blurs the page behind it while it asks, and the blur goes with it', () => {
    render(<CookieBanner />);
    expect(screen.getByTestId('cookie-backdrop').className).toContain('backdrop-blur');
    fireEvent.click(screen.getByRole('button', { name: 'Allow all' }));
    expect(screen.queryByTestId('cookie-backdrop')).toBeNull();
  });

  it('stays away once a choice is saved', () => {
    window.localStorage.setItem('beginso.cookie-consent', JSON.stringify({ choice: 'essential', savedAt: new Date().toISOString() }));
    render(<CookieBanner />);
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
  });

  it('remembers from the cookie when local storage is empty (cleared or blocked)', () => {
    document.cookie = 'beginso_cookie_consent=all; Path=/';
    render(<CookieBanner />);
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
  });

  it('"Cookie settings" brings the bar back so the choice can be changed', () => {
    window.localStorage.setItem('beginso.cookie-consent', JSON.stringify({ choice: 'all', savedAt: new Date().toISOString() }));
    render(
      <>
        <CookieBanner />
        <CookieSettingsButton />
      </>,
    );
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cookie settings' }));
    });
    expect(screen.getByRole('region', { name: 'Cookies' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(readCookieConsent()).toBe('essential');
    expect(screen.queryByRole('region', { name: 'Cookies' })).toBeNull();
  });
});
