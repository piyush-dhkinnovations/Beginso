/**
 * A visitor who chose "Use template" signed out is sent to sign-up carrying /templates/apply/<slug> in `next`. Every way in must hand that address on, so the
 * template is applied in the new (or existing) account: email sign-up (through the verification page), email sign-in (including an address that is not verified
 * yet), and Google sign-up and sign-in. An address that leaves the site is never followed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

const APPLY = '/templates/apply/job-application';

const { mockSearchParams, mockLogin, mockPush } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
  mockLogin: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn(), GoogleAuthProvider: vi.fn(), signInWithPopup: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: mockLogin, logout: vi.fn() }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/common/LoadingSpinner', () => ({ LoadingSpinner: () => <span data-testid="spinner" /> }));
// The real button asks Google; here it only calls the handler the form gave it, which is the part that carries `next`.
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onClick, label }: { onClick: () => void; label?: string }) => (
    <button type="button" onClick={onClick}>
      {label ?? 'Google'}
    </button>
  ),
}));

const mockAuth = { login: vi.fn(), signup: vi.fn(), loginWithGoogle: vi.fn() };
vi.mock('@/services/auth', () => ({
  authService: {
    login: (...a: unknown[]) => mockAuth.login(...a),
    signup: (...a: unknown[]) => mockAuth.signup(...a),
    loginWithGoogle: (...a: unknown[]) => mockAuth.loginWithGoogle(...a),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockLogin.mockResolvedValue(undefined);
  mockAuth.login.mockResolvedValue(undefined);
  mockAuth.signup.mockResolvedValue(undefined);
  mockAuth.loginWithGoogle.mockResolvedValue(undefined);
  mockSearchParams.current = new URLSearchParams({ next: APPLY });
});

describe('Google sign-up and sign-in carry the template address', () => {
  it('Google sign-UP hands the apply address to login(), so the template opens in the new account', async () => {
    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign up with google/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockAuth.loginWithGoogle).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith(APPLY);
  });

  it('Google sign-IN hands the apply address to login()', async () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    expect(mockLogin).toHaveBeenCalledWith(APPLY);
  });

  it('never follows a next address that leaves the site (Google, both forms)', async () => {
    mockSearchParams.current = new URLSearchParams({ next: 'https://evil.example.com/templates/apply/x' });
    const signup = render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign up with google/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
    expect(mockLogin).toHaveBeenLastCalledWith(undefined);
    signup.unmount();

    mockSearchParams.current = new URLSearchParams({ next: '//evil.example.com' });
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: /google/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(2));
    expect(mockLogin).toHaveBeenLastCalledWith(undefined);
  });

  it('with no next address, Google goes to the default place', async () => {
    mockSearchParams.current = new URLSearchParams();
    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: /sign up with google/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith(undefined));
  });
});

describe('email sign-up and sign-in carry it too', () => {
  it('email sign-up sends the address on to the verification page', async () => {
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Asha Rao' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'asha@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Str0ng-pass!word' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'Str0ng-pass!word' } });
    fireEvent.click(screen.getByRole('button', { name: /create account|sign up/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith(`/verify-email?next=${encodeURIComponent(APPLY)}`);
  });

  it('email sign-in hands the address to login()', async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^(log in|sign in)$/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith(APPLY));
  });

  it('an address that is not verified yet is sent to the verification page WITH the address (it used to be dropped)', async () => {
    mockAuth.login.mockRejectedValueOnce({ code: 'auth/email-not-verified' });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^(log in|sign in)$/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith(`/verify-email?next=${encodeURIComponent(APPLY)}`);
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('with no next address, the verification page is plain', async () => {
    mockSearchParams.current = new URLSearchParams();
    mockAuth.login.mockRejectedValueOnce({ code: 'auth/email-not-verified' });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret-pass-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^(log in|sign in)$/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/verify-email'));
  });
});
