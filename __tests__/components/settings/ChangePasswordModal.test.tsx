/**
 * __tests__/components/settings/ChangePasswordModal.test.tsx
 * Feature: sprint-6-settings
 * Tests: ChangePasswordModal — success flow, wrong-current-password field error, mismatch
 * blocks submit, other-failure toast with values intact
 * Requirements: 4.1-4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockSignIn = vi.fn();
const mockUpdatePassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'u1' } } }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

const mockNotifyPasswordChanged = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: { notifyPasswordChanged: (...args: unknown[]) => mockNotifyPasswordChanged(...args) },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockUpdatePassword.mockReset();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockNotifyPasswordChanged.mockReset().mockResolvedValue(undefined);
    mockToast.mockReset();
  });

  it('re-signs in, updates the password, signs back out, notifies the backend, and closes on success', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);
    mockUpdatePassword.mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<ChangePasswordModal isOpen onClose={onClose} email="jordan@example.com" />);

    await user.type(screen.getByLabelText('Current password'), 'oldpass1');
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'jordan@example.com', 'oldpass1'));
    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith(expect.anything(), 'newpass1'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockNotifyPasswordChanged).toHaveBeenCalled());
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Password updated.', 'success'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows a field-level error beside Current Password on a wrong-credential failure, and does not close', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    const onClose = vi.fn();

    render(<ChangePasswordModal isOpen onClose={onClose} email="jordan@example.com" />);

    await user.type(screen.getByLabelText('Current password'), 'wrongpass');
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a toast for other failures (e.g. rate-limit) and keeps entered values intact', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: 'auth/too-many-requests', message: 'Firebase: Error (auth/too-many-requests).' });
    const onClose = vi.fn();

    render(<ChangePasswordModal isOpen onClose={onClose} email="jordan@example.com" />);

    await user.type(screen.getByLabelText('Current password'), 'oldpass1');
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        'Too many failed login attempts. Access has been temporarily disabled. Please try again later.',
        'error'
      )
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Current password')).toHaveValue('oldpass1');
  });

  it('blocks submission client-side when new/confirm passwords do not match', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal isOpen onClose={vi.fn()} email="jordan@example.com" />);

    await user.type(screen.getByLabelText('Current password'), 'oldpass1');
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'different1');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('signs back out even when updatePassword itself fails', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);
    mockUpdatePassword.mockRejectedValue({ code: 'auth/weak-password' });

    render(<ChangePasswordModal isOpen onClose={vi.fn()} email="jordan@example.com" />);

    await user.type(screen.getByLabelText('Current password'), 'oldpass1');
    await user.type(screen.getByLabelText('New password'), 'newpass1');
    await user.type(screen.getByLabelText('Confirm new password'), 'newpass1');
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(mockNotifyPasswordChanged).not.toHaveBeenCalled();
  });

  it('shows the length rule up front and can reveal both new-password fields', async () => {
    const user = userEvent.setup();
    render(<ChangePasswordModal isOpen onClose={vi.fn()} email="jordan@example.com" />);

    expect(screen.getByText('Use 8 to 128 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show passwords' }));
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Hide passwords' }));
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'password');
  });
});
