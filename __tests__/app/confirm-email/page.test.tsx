import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'tok-abcdefghijklmnopqrstuvwxyz' }) }));
const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/services/publicForm', () => ({ publicFormService: { confirmEmailVerification: confirm } }));

import ConfirmEmailPage from '@/app/confirm-email/[token]/page';

beforeEach(() => {
  confirm.mockReset();
  window.history.replaceState = vi.fn();
});

describe('/confirm-email/[token]', () => {
  it('confirms the link once and says the email is confirmed', async () => {
    confirm.mockResolvedValue('verified');
    render(<ConfirmEmailPage />);
    expect(await screen.findByText('Your email is confirmed')).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith('tok-abcdefghijklmnopqrstuvwxyz');
  });

  it('keeps the one-time link out of the address bar', async () => {
    confirm.mockResolvedValue('verified');
    render(<ConfirmEmailPage />);
    await screen.findByText('Your email is confirmed');
    expect(window.history.replaceState).toHaveBeenCalledWith(null, '', '/confirm-email');
  });

  it.each([
    ['expired', 'This link has expired'],
    ['invalid', 'This link does not work'],
  ])('says so for a %s link', async (state, title) => {
    confirm.mockResolvedValue(state);
    render(<ConfirmEmailPage />);
    expect(await screen.findByText(title)).toBeInTheDocument();
  });

  it('says we could not confirm when the server fails', async () => {
    confirm.mockRejectedValue(new Error('500'));
    render(<ConfirmEmailPage />);
    expect(await screen.findByText('We could not confirm your email')).toBeInTheDocument();
  });
});
