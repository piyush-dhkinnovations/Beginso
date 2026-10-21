/**
 * The sign-in gate of a members-only form: signing in happens right there (email and password, or Google) and returns to the same
 * form; only "Create account" goes to the sign-up page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockLogin, mockPush, mockSearch } = vi.hoisted(() => ({ mockLogin: vi.fn(), mockPush: vi.fn(), mockSearch: { current: new URLSearchParams() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => mockSearch.current,
}));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn(), GoogleAuthProvider: vi.fn(), signInWithPopup: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: mockLogin, logout: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const svc = vi.hoisted(() => ({ login: vi.fn(), loginWithGoogle: vi.fn() }));
vi.mock('@/services/auth', () => ({ authService: { ...svc, logout: vi.fn(), getMe: vi.fn() } }));

import { LoginGate } from '@/components/public-form/LoginGate';

const draw = (slug = 'film-submissions') => render(<LoginGate slug={slug} formTitle="Film submissions" />);
const email = () => screen.getByLabelText('Email Address');
const password = () => screen.getByLabelText('Password');

beforeEach(() => {
  mockLogin.mockReset().mockResolvedValue(undefined);
  mockPush.mockReset();
  mockSearch.current = new URLSearchParams();
  svc.login.mockReset().mockResolvedValue(undefined);
  svc.loginWithGoogle.mockReset().mockResolvedValue(undefined);
});

describe('LoginGate: what it shows', () => {
  it('says the form needs a Beginso account, and shows the sign-in form on the page itself', () => {
    draw();
    expect(screen.getByRole('heading', { name: 'Sign in to respond' })).toBeInTheDocument();
    expect(screen.getByText('Film submissions', { selector: 'strong' })).toBeInTheDocument();
    expect(email()).toBeInTheDocument();
    expect(password()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument();
  });

  it('no longer sends the person to the main login page to sign in', () => {
    draw();
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).not.toMatch(/^\/login/);
  });

  it('"Create account" still goes to the sign-up page and comes back to this form', () => {
    draw();
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/signup?next=%2Ff%2Ffilm-submissions');
  });

  it('is a labelled region with the heading as the page heading', () => {
    draw();
    const region = screen.getByRole('region', { name: 'Sign in required' });
    expect(within(region).getAllByRole('heading')).toHaveLength(1);
    expect(within(region).getByRole('heading')).toHaveProperty('tagName', 'H1');
  });

  it('has the password hidden until asked, with a toggle', async () => {
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password()).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password()).toHaveAttribute('type', 'password');
  });
});

describe('LoginGate: signing in', () => {
  it('signs in with email and password, then returns to this same form', async () => {
    draw();
    await userEvent.type(email(), 'asha@example.com');
    await userEvent.type(password(), 'secret-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(svc.login).toHaveBeenCalledWith('asha@example.com', 'secret-pass-1');
    expect(mockLogin).toHaveBeenCalledWith('/f/film-submissions'); // back here, not the dashboard
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('signs in with Google, then returns to this same form', async () => {
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('/f/film-submissions'));
    expect(svc.loginWithGoogle).toHaveBeenCalledTimes(1);
    expect(svc.login).not.toHaveBeenCalled();
  });

  it('does not sign in on an empty or invalid form, and says what is wrong', async () => {
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(svc.login).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/./, { selector: 'p[id$="-error"]' })).not.toHaveLength(0);
    await userEvent.type(email(), 'not-an-email');
    await userEvent.type(password(), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(svc.login).not.toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows a wrong-password failure on the gate, keeps the email, and stays here', async () => {
    svc.login.mockRejectedValue(Object.assign(new Error('bad'), { code: 'auth/invalid-credential' }));
    draw();
    await userEvent.type(email(), 'asha@example.com');
    await userEvent.type(password(), 'wrong-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(email()).toHaveValue('asha@example.com');
    expect(mockLogin).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled(); // can try again
  });

  it('shows a failed Google sign-in (closed popup, say) and can be tried again', async () => {
    svc.loginWithGoogle.mockRejectedValue(Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }));
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeEnabled());
  });

  it('an unverified email goes to verification instead of failing silently', async () => {
    svc.login.mockRejectedValue(Object.assign(new Error('unverified'), { code: 'auth/email-not-verified' }));
    draw();
    await userEvent.type(email(), 'asha@example.com');
    await userEvent.type(password(), 'secret-pass-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/verify-email'));
  });

  it('works from the keyboard: Enter in the password field submits', async () => {
    draw();
    await userEvent.type(email(), 'asha@example.com');
    await userEvent.type(password(), 'secret-pass-1{Enter}');
    await waitFor(() => expect(svc.login).toHaveBeenCalledWith('asha@example.com', 'secret-pass-1'));
  });
});

describe('LoginGate: the return address', () => {
  it('is this form, whatever the address bar says (a ?next= belongs to the login page, not to this form)', async () => {
    mockSearch.current = new URLSearchParams({ next: '/dashboard' });
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('/f/film-submissions'));
  });

  it.each([
    ['a slug with a slash', 'a/b', '/f/a%2Fb'],
    ['a slug that looks like a protocol-relative address', '//evil.com', '/f/%2F%2Fevil.com'],
    ['a slug with a space', 'a b', '/f/a%20b'],
  ])('encodes %s so it can only ever be a path on this site', async (_name, slug, expected) => {
    draw(slug);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith(expected));
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', `/signup?next=${encodeURIComponent(expected)}`);
    expect(expected.startsWith('/f/')).toBe(true);
    expect(expected.slice(1)).not.toMatch(/^[/\\]/);
  });
});
