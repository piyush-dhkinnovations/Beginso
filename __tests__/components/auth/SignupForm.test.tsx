/**
 * __tests__/SignupForm.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: SignupForm — 4 fields rendered, loading disables button, success toast, error region
 * Requirements: 5.1, 5.6, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SignupForm } from '@/components/auth/SignupForm';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockSearchParams, mockPush } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: vi.fn(), logout: vi.fn() }),
}));

const mockToast = vi.fn();
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <span data-testid="spinner" />,
}));

vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button>Sign up with Google</button>,
}));

const mockAuthSignup = vi.fn();
vi.mock('@/services/auth', () => ({
  authService: {
    signup: (...args: unknown[]) => mockAuthSignup(...args),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Uses fireEvent (sets the final value directly) rather than userEvent.type
// (simulates every keystroke) — these tests only care about the submitted
// value, not real per-key interaction, and this cut the suite's time noticeably.
async function fillAndSubmitForm(opts?: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}) {
  const {
    name = 'Jane Cooper',
    email = 'jane@example.com',
    password = 'StrongPass1!',
    confirmPassword = 'StrongPass1!',
  } = opts ?? {};

  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: name } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: email } });
  // Password field (first password input)
  const pwInputs = document.querySelectorAll('input[type="password"]');
  fireEvent.change(pwInputs[0] as HTMLElement, { target: { value: password } });
  fireEvent.change(pwInputs[1] as HTMLElement, { target: { value: confirmPassword } });
  fireEvent.click(screen.getByRole('button', { name: /sign up$/i }));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SignupForm component', () => {
  beforeEach(() => {
    mockAuthSignup.mockReset();
    mockToast.mockReset();
    mockPush.mockReset();
    mockSearchParams.current = new URLSearchParams();
  });

  it('renders all 4 required fields', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    // Two password fields: "Password" and "Confirm Password"
    const passwordFields = document.querySelectorAll('input[type="password"]');
    expect(passwordFields).toHaveLength(2);
  });

  it('both password fields start masked (type="password")', () => {
    render(<SignupForm />);
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    expect(passwordInputs).toHaveLength(2);
  });

  it('disables submit button and shows loading spinner during submission', async () => {
    // Keep pending indefinitely
    mockAuthSignup.mockReturnValueOnce(new Promise(() => {}));

    render(<SignupForm />);

    await fillAndSubmitForm();

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /sign up$/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  it('shows verification-code success toast on successful signup', async () => {
    mockAuthSignup.mockResolvedValueOnce({
      token: 'tok123',
      user: { id: 'u1', name: 'Jane Cooper', email: 'jane@example.com' },
      workspace: { id: 'ws1', name: 'Jane WS' },
    });

    render(<SignupForm />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringMatching(/verification code sent/i),
        'success'
      );
    });
  });

  it('shows backend error in alert region without clearing user input', async () => {
    mockAuthSignup.mockRejectedValueOnce(
      Object.assign(new Error('Email already in use'), {
        response: {
          status: 409,
          data: { error: { message: 'An account with this email already exists.' } },
        },
      })
    );

    render(<SignupForm />);
    await fillAndSubmitForm();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Email input should still have its value
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('jane@example.com');
  });

  it('shows inline Zod validation error for mismatched passwords without submitting', async () => {
    render(<SignupForm />);

    await fillAndSubmitForm({
      password: 'StrongPass1!',
      confirmPassword: 'DifferentPass1!',
    });

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    // Auth service should NOT be called
    expect(mockAuthSignup).not.toHaveBeenCalled();
  });

  it('shows inline validation error for short password without API call', async () => {
    render(<SignupForm />);

    await fillAndSubmitForm({
      password: 'short',
      confirmPassword: 'short',
    });

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockAuthSignup).not.toHaveBeenCalled();
  });

  // ─── Sprint 9 task 3.5 / requirements §7.5.1: ?next= forwarded to /verify-email ─

  it('forwards a valid internal ?next= to /verify-email on successful signup', async () => {
    mockSearchParams.current = new URLSearchParams('next=/invite/abc123');
    mockAuthSignup.mockResolvedValueOnce({
      token: 'tok123',
      user: { id: 'u1', name: 'Jane Cooper', email: 'jane@example.com' },
      workspace: { id: 'ws1', name: 'Jane WS' },
    });

    render(<SignupForm />);
    await fillAndSubmitForm();

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/verify-email?next=%2Finvite%2Fabc123')
    );
  });

  it('drops a crafted external ?next= (open-redirect guard) on signup', async () => {
    mockSearchParams.current = new URLSearchParams('next=' + encodeURIComponent('//evil.example.com'));
    mockAuthSignup.mockResolvedValueOnce({
      token: 'tok123',
      user: { id: 'u1', name: 'Jane Cooper', email: 'jane@example.com' },
      workspace: { id: 'ws1', name: 'Jane WS' },
    });

    render(<SignupForm />);
    await fillAndSubmitForm();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/verify-email'));
  });
});
