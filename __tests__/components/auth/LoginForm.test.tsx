/**
 * __tests__/LoginForm.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: LoginForm — 30s timeout, 401 error preserves email, password toggle, Property 8
 * Requirements: 7.4, 7.6, 7.7, 7.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';
import { LoginForm } from '@/components/auth/LoginForm';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <span data-testid="spinner" />,
}));

vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button type="button">Sign in with Google</button>,
}));

const mockAuthLogin = vi.fn();
vi.mock('@/services/auth', () => ({
  authService: {
    login: (...args: unknown[]) => mockAuthLogin(...args),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('LoginForm component', () => {
  beforeEach(() => {
    mockAuthLogin.mockReset();
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    // Password label (exact) — to avoid matching "Confirm Password" if present
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('password field starts masked (type="password")', () => {
    render(<LoginForm />);
    // The password input specifically (identified by id)
    const pwInput = document.getElementById('password') as HTMLInputElement;
    expect(pwInput).not.toBeNull();
    expect(pwInput.type).toBe('password');
  });

  it('password toggle switches between text and password type', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const pwInput = document.getElementById('password') as HTMLInputElement;
    expect(pwInput.type).toBe('password');

    // Click toggle → show
    const showBtn = screen.getByRole('button', { name: /show password/i });
    await user.click(showBtn);
    expect(pwInput.type).toBe('text');

    // Click toggle → hide again
    const hideBtn = screen.getByRole('button', { name: /hide password/i });
    await user.click(hideBtn);
    expect(pwInput.type).toBe('password');
  });

  it('shows 401 error while preserving the email field value', async () => {
    mockAuthLogin.mockRejectedValueOnce(
      Object.assign(new Error('Invalid credentials'), {
        response: { status: 401, data: { error: { message: 'Invalid credentials' } } },
      })
    );

    const user = userEvent.setup();
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'wrongpassword' } });
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Email is preserved
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('user@example.com');
  });

  it('disables the submit button while loading', async () => {
    mockAuthLogin.mockReturnValueOnce(new Promise(() => {}));

    const user = userEvent.setup();
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(document.getElementById('password')!, { target: { value: 'password123' } });
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled();
    });
  });

  it('30-second timeout re-enables submit button and shows timeout message', async () => {
    vi.useFakeTimers();
    mockAuthLogin.mockReturnValueOnce(new Promise(() => {}));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const pwInput = document.getElementById('password')!;
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    // Sync input events
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(pwInput, { target: { value: 'password123' } });

    act(() => {
      fireEvent.submit(submitBtn.closest('form')!);
    });

    // Flush validation microtasks so onSubmit runs and registers the timeout
    await act(async () => {
      await Promise.resolve();
    });

    // Advance past 30 seconds
    act(() => {
      vi.advanceTimersByTime(31000);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/connection timeout/i);
    expect(submitBtn).not.toBeDisabled();

    vi.useRealTimers();
  });

  // ─── Property 8: Password Visibility Toggle Round-Trip ───────────────────

  it('Property 8: password toggle is a round-trip — value preserved throughout', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 20 }), (password) => {
        const { unmount } = render(<LoginForm />);
        const pwInput = document.getElementById('password') as HTMLInputElement;

        fireEvent.change(pwInput, { target: { value: password } });
        const before = pwInput.value;

        // Toggle to text
        const showBtn = screen.queryByRole('button', { name: /show password/i });
        if (showBtn) {
          fireEvent.click(showBtn);
        }
        expect(pwInput.value).toBe(before);
        expect(pwInput.type).toBe('text');

        // Toggle back to password
        const hideBtn = screen.queryByRole('button', { name: /hide password/i });
        if (hideBtn) {
          fireEvent.click(hideBtn);
        }
        expect(pwInput.value).toBe(before);
        expect(pwInput.type).toBe('password');

        unmount();
      }),
      { numRuns: 25 }
    );
  });
});
