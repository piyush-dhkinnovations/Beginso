import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerifyEmailPage from '@/app/(auth)/verify-email/page';

const mockVerifyOtp = vi.fn();
const mockLogin = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: { email: string }) => void) => {
    callback({ email: 'user@example.com' });
    return vi.fn();
  },
}));
vi.mock('@/services/auth', () => ({
  authService: {
    verifyEmailOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    resendVerificationEmail: vi.fn(),
  },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ login: mockLogin }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

describe('VerifyEmailPage OTP mode', () => {
  it('accepts a pasted six-digit code and verifies the account', async () => {
    const user = userEvent.setup();
    mockVerifyOtp.mockResolvedValueOnce(undefined);
    mockLogin.mockResolvedValueOnce(undefined);

    render(<VerifyEmailPage />);
    const firstDigit = screen.getByLabelText('Verification code digit 1');
    fireEvent.paste(firstDigit, { clipboardData: { getData: () => '123456' } });

    await user.click(screen.getByRole('button', { name: 'Verify email' }));

    await waitFor(() => expect(mockVerifyOtp).toHaveBeenCalledWith('123456'));
    expect(mockToast).toHaveBeenCalledWith('Email verified successfully.', 'success');
    expect(mockLogin).toHaveBeenCalled();
  });
});
