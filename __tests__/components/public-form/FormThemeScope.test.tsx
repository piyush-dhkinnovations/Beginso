import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useEffect } from 'react';
import { FormThemeScope, useSetHostScheme } from '@/components/public-form/FormThemeScope';

const scope = () => document.querySelector('[data-form-theme]') as HTMLElement;
const root = document.documentElement;
const originalMatchMedia = window.matchMedia;

function mockOsDark(dark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: dark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-dark');
  mockOsDark(false);
});

afterEach(() => {
  window.history.pushState({}, '', '/');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-dark');
  document.body.style.background = '';
  root.style.background = '';
  Object.defineProperty(window, 'matchMedia', { writable: true, configurable: true, value: originalMatchMedia });
});

describe('FormThemeScope', () => {
  it('renders children inside a light-scheme wrapper by default', () => {
    render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(scope()).not.toHaveAttribute('data-theme');
    expect(scope()).not.toHaveAttribute('data-embed');
    expect(scope().style.colorScheme).toBe('light');
  });

  it('removes the admin theme attributes from <html> while mounted and restores them on unmount', () => {
    root.setAttribute('data-theme', 'dark');
    root.setAttribute('data-dark', 'midnight');
    const { unmount } = render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(root).not.toHaveAttribute('data-theme');
    expect(root).not.toHaveAttribute('data-dark');
    unmount();
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root).toHaveAttribute('data-dark', 'midnight');
  });

  it('leaves <html> alone on unmount when it had no theme to begin with', () => {
    const { unmount } = render(<FormThemeScope><p>form</p></FormThemeScope>);
    unmount();
    expect(root).not.toHaveAttribute('data-theme');
  });

  it('an OS dark preference does not darken the form unless the embed asks for auto', () => {
    mockOsDark(true);
    render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(scope()).not.toHaveAttribute('data-theme');
  });

  it('?theme=dark scopes the dark tokens to the wrapper', () => {
    window.history.pushState({}, '', '/?embed=1&theme=dark');
    render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(scope()).toHaveAttribute('data-theme', 'dark');
    expect(scope()).toHaveAttribute('data-embed');
    expect(scope().style.colorScheme).toBe('dark');
  });

  it('?theme=auto follows the OS scheme when no host scheme has been reported', () => {
    window.history.pushState({}, '', '/?theme=auto');
    mockOsDark(true);
    render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(scope()).toHaveAttribute('data-theme', 'dark');
  });

  it('?theme=auto prefers the host page scheme reported over the embed handshake', () => {
    window.history.pushState({}, '', '/?theme=auto');
    mockOsDark(true);
    function Reporter() {
      const set = useSetHostScheme();
      useEffect(() => set('light'), [set]);
      return null;
    }
    render(<FormThemeScope><Reporter /></FormThemeScope>);
    expect(scope()).not.toHaveAttribute('data-theme');
  });

  it('a host scheme update re-themes a live auto embed', () => {
    window.history.pushState({}, '', '/?theme=auto');
    let set: ReturnType<typeof useSetHostScheme> = () => {};
    function Grab() {
      set = useSetHostScheme();
      return null;
    }
    render(<FormThemeScope><Grab /></FormThemeScope>);
    expect(scope()).not.toHaveAttribute('data-theme');
    act(() => set('dark'));
    expect(scope()).toHaveAttribute('data-theme', 'dark');
  });

  it('embed with ?bg=0 makes the document transparent and restores it afterwards', () => {
    window.history.pushState({}, '', '/?embed=1&bg=0');
    document.body.style.background = 'red';
    const { unmount } = render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(document.body.style.background).toBe('transparent');
    expect(root.style.background).toBe('transparent');
    unmount();
    expect(document.body.style.background).toBe('red');
  });

  it('?bg=0 without ?embed=1 leaves the document background alone', () => {
    window.history.pushState({}, '', '/?bg=0');
    render(<FormThemeScope><p>form</p></FormThemeScope>);
    expect(document.body.style.background).not.toBe('transparent');
  });
});
