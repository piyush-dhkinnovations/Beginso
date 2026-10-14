/**
 * Feature: auth screens
 * Tests: the two-pane (auth) layout, the entrance animation template, and the login page's Forgot password? placement.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';

const mockPath = vi.hoisted(() => ({ value: '/login' }));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPath.value,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: vi.fn() }) }));

import AuthLayout from '@/app/(auth)/layout';
import AuthTemplate from '@/app/(auth)/template';
import LoginPage from '@/app/(auth)/login/page';

describe('(auth) layout', () => {
  it('puts the wordmark (linking home) above the form column and renders the page inside it', () => {
    render(
      <AuthLayout>
        <p>the screen</p>
      </AuthLayout>
    );
    expect(screen.getByRole('link', { name: 'Beginso home' })).toHaveAttribute('href', '/');
    expect(screen.getByText('the screen')).toBeInTheDocument();
    expect(screen.getAllByAltText('Beginso').length).toBeGreaterThan(0);
  });

  it('keeps the form column narrow (no big card) and the brand panel decorative', () => {
    const { container } = render(
      <AuthLayout>
        <p>x</p>
      </AuthLayout>
    );
    expect(container.querySelector('main > div')).toHaveClass('max-w-sm');
    const aside = container.querySelector('aside')!;
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(aside).toHaveClass('hidden', 'lg:flex');
    expect(aside).toHaveAttribute('data-scene', 'login');
  });

  it.each([['/signup','signup'],['/forgot-password','forgot-password'],['/reset-password','reset-password'],['/verify-email','verify-email'],['/verification-code','verification-code']])('shows its own scene on %s', (path, scene) => {
    mockPath.value = path;
    const { container } = render(<AuthLayout><p>x</p></AuthLayout>);
    expect(container.querySelector('aside')).toHaveAttribute('data-scene', scene);
    mockPath.value = '/login';
  });
});

describe('(auth) template', () => {
  it('wraps every screen in the entrance-animation container', () => {
    const { container } = render(
      <AuthTemplate>
        <p>login</p>
      </AuthTemplate>
    );
    expect(container.firstElementChild).toHaveClass('auth-enter');
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('the stylesheet staggers the parts of a screen and the global reduced-motion rule covers it', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    expect(css).toMatch(/\.auth-enter \.auth-touch > \* \{\s*animation: fadeUp/);
    expect(css).toMatch(/\.auth-enter \.auth-touch > :nth-child\(2\) \{ animation-delay: 70ms/);
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*animation-duration: 1ms !important/);
  });
});

describe('login page', () => {
  it('has Forgot password? right under the password field, on the right, and not in the footer', () => {
    const { container } = render(<LoginPage />);
    const forgot = screen.getByRole('link', { name: 'Forgot password?' });
    expect(forgot).toHaveAttribute('href', '/forgot-password');
    expect(forgot.parentElement).toHaveClass('justify-end');
    const form = container.querySelector('form')!;
    expect(form.contains(forgot)).toBe(true);
    const password = form.querySelector('#password')!;
    // The link comes after the password field and before the Log In button.
    expect(password.compareDocumentPosition(forgot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(forgot.compareDocumentPosition(screen.getByRole('button', { name: 'Log In' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Forgot password?' })).toHaveLength(1);
  });

  it('keeps the sign-up link below the form', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
  });
});
