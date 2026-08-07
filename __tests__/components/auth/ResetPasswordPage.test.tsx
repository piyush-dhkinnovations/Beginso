import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

const mockVerifyCode = vi.fn();
const mockConfirmReset = vi.fn();

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  verifyPasswordResetCode: (...args: unknown[]) => mockVerifyCode(...args),
  confirmPasswordReset: (...args: unknown[]) => mockConfirmReset(...args),
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    mockVerifyCode.mockReset();
    mockConfirmReset.mockReset();
    window.history.replaceState({}, '', '/reset-password?oobCode=valid-code');
  });

  it('validates the Firebase action code and resets matching passwords', async () => {
    const user = userEvent.setup();
    mockVerifyCode.mockResolvedValueOnce('user@example.com');
    mockConfirmReset.mockResolvedValueOnce(undefined);

    render(<ResetPasswordPage />);
    expect(await screen.findByText('user@example.com')).toBeInTheDocument();

    await user.type(screen.getByLabelText('New password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Confirm new password'), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mockConfirmReset).toHaveBeenCalledWith(expect.anything(), 'valid-code', 'StrongPass1!'));
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
  });

  it('shows an inline error when passwords do not match', async () => {
    mockVerifyCode.mockResolvedValueOnce('user@example.com');
    render(<ResetPasswordPage />);
    await screen.findByText('user@example.com');

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'StrongPass1!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'DifferentPass1!' } });

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Update password' })).toBeDisabled();
    expect(mockConfirmReset).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'StrongPass1!' } });
    await waitFor(() => expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
  });

  it('rejects a missing or invalid action code', async () => {
    mockVerifyCode.mockRejectedValueOnce(new Error('expired'));
    render(<ResetPasswordPage />);

    expect(await screen.findByText('Reset link unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password');
  });
});
