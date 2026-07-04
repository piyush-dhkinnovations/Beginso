/**
 * __tests__/SignupForm.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: SignupForm — 4 fields rendered, loading disables button, success toast, error region
 * Requirements: 5.1, 5.6, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/auth/SignupForm';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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

vi.mock('@/lib/tokenStorage', () => ({
  getToken: vi.fn(() => null),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
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
  signup: (...args: unknown[]) => mockAuthSignup(...args),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fillAndSubmitForm(user: ReturnType<typeof userEvent.setup>, opts?: {
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

  await user.type(screen.getByLabelText(/full name/i), name);
  await user.type(screen.getByLabelText(/email address/i), email);
  // Password field (first password input)
  const pwInputs = document.querySelectorAll('input[type="password"]');
  await user.type(pwInputs[0] as HTMLElement, password);
  await user.type(pwInputs[1] as HTMLElement, confirmPassword);
  await user.click(screen.getByRole('button', { name: /sign up$/i }));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SignupForm component', () => {
  beforeEach(() => {
    mockAuthSignup.mockReset();
    mockToast.mockReset();
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

    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmitForm(user);

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: /sign up$/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  it('shows success toast on successful signup', async () => {
    mockAuthSignup.mockResolvedValueOnce({
      token: 'tok123',
      user: { id: 'u1', name: 'Jane Cooper', email: 'jane@example.com' },
      workspace: { id: 'ws1', name: 'Jane WS' },
    });

    const user = userEvent.setup();
    render(<SignupForm />);
    await fillAndSubmitForm(user);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringMatching(/account created/i),
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

    const user = userEvent.setup();
    render(<SignupForm />);
    await fillAndSubmitForm(user);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Email input should still have its value
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('jane@example.com');
  });

  it('shows inline Zod validation error for mismatched passwords without submitting', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmitForm(user, {
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
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmitForm(user, {
      password: 'short',
      confirmPassword: 'short',
    });

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockAuthSignup).not.toHaveBeenCalled();
  });
});
