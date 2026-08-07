import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationCodePage from '@/app/(auth)/verification-code/page';

const mockRevealVerificationCode = vi.fn();

vi.mock('@/services/auth', () => ({
  authService: {
    revealVerificationCode: (...args: unknown[]) => mockRevealVerificationCode(...args),
  },
}));

describe('VerificationCodePage', () => {
  beforeEach(() => {
    mockRevealVerificationCode.mockReset();
    window.history.replaceState(null, '', '/verification-code#ticket=opaque-ticket');
  });

  it('removes the ticket fragment before revealing and displays the code once', async () => {
    mockRevealVerificationCode.mockImplementationOnce(async (ticket: string) => {
      expect(ticket).toBe('opaque-ticket');
      expect(window.location.hash).toBe('');
      return { code: '482175', expiresAt: '2026-08-07T15:40:00.000Z' };
    });

    render(<VerificationCodePage />);

    expect(await screen.findByRole('status', { name: 'Verification code 4 8 2 1 7 5' })).toHaveTextContent('482 175');
    expect(screen.queryByRole('link', { name: 'Enter code' })).not.toBeInTheDocument();
    expect(mockRevealVerificationCode).toHaveBeenCalledOnce();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('copies exactly the six digits', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    mockRevealVerificationCode.mockResolvedValueOnce({
      code: '482175',
      expiresAt: '2026-08-07T15:40:00.000Z',
    });

    render(<VerificationCodePage />);
    await screen.findByText('482 175');
    await user.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(writeText).toHaveBeenCalledWith('482175');
    expect(screen.getByText('Verification code copied.')).toBeInTheDocument();
  });

  it('shows the generic unavailable state when the fragment is missing', async () => {
    window.history.replaceState(null, '', '/verification-code');

    render(<VerificationCodePage />);

    expect(await screen.findByText('Verification link unavailable')).toBeInTheDocument();
    expect(mockRevealVerificationCode).not.toHaveBeenCalled();
  });

  it('shows the generic unavailable state for a consumed or expired ticket', async () => {
    mockRevealVerificationCode.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400 },
    });

    render(<VerificationCodePage />);

    expect(await screen.findByText('Verification link unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request another email' })).toHaveAttribute('href', '/verify-email');
  });

  it('allows a network failure to be retried with the in-memory ticket', async () => {
    const user = userEvent.setup();
    mockRevealVerificationCode
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ code: '482175', expiresAt: '2026-08-07T15:40:00.000Z' });

    render(<VerificationCodePage />);
    await screen.findByText('Unable to load your code');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('482 175')).toBeInTheDocument();
    expect(mockRevealVerificationCode).toHaveBeenCalledTimes(2);
  });
});
