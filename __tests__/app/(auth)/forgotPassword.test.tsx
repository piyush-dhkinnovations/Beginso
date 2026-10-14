/**
 * Feature: forgot password
 * Tests: the page tells the truth about the address (sent / no account / Google-only / too many) instead of always saying a link is coming.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRequest = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth', () => ({ authService: { requestPasswordReset: (e: string) => mockRequest(e) } }));

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

const apiError = (status: number, message: string, code?: string) => Object.assign(new Error('x'), { response: { status, data: { message, code } } });

async function submit(email: string) {
  const user = userEvent.setup();
  render(<ForgotPasswordPage />);
  await user.type(screen.getByLabelText('Email address'), email);
  await user.click(screen.getByRole('button', { name: 'Send reset link' }));
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => mockRequest.mockReset());

  it('says the link is on its way to that address only after the backend accepted it', async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await submit('ann@example.com');
    expect(await screen.findByText('A password-reset link is on its way to ann@example.com.')).toBeInTheDocument();
  });

  it('shows the backend message and a sign-up link when no account uses the address, and never claims a link was sent', async () => {
    mockRequest.mockRejectedValueOnce(apiError(404, "We couldn't find a Beginso account with that email.", 'ACCOUNT_NOT_FOUND'));
    await submit('nobody@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't find a Beginso account with that email.");
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByText(/on its way/)).not.toBeInTheDocument();
  });

  it('shows the Google-only and too-many-requests messages as they come from the backend', async () => {
    mockRequest.mockRejectedValueOnce(apiError(400, 'This account signs in with Google.', 'NO_PASSWORD'));
    await submit('g@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('This account signs in with Google.');
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument();
  });

  it('falls back to a generic line when the mail service or network fails', async () => {
    mockRequest.mockRejectedValueOnce(apiError(503, 'boom'));
    await submit('a@example.com');
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send the reset email right now. Please try again.');
  });
});
