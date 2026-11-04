/**
 * The Share link card on a form's overview: the link, Copy (which says "Copied" for a moment), and a QR code that saves as a picture when clicked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
const toDataURL = vi.hoisted(() => vi.fn());
vi.mock('qrcode', () => ({ toDataURL: (...a: unknown[]) => toDataURL(...a) }));

import { ShareLinkBanner } from '@/components/forms/ShareLinkBanner';

const URL_ = 'https://www.beginso.com/f/abc123';

describe('ShareLinkBanner', () => {
  beforeEach(() => {
    toast.mockReset();
    toDataURL.mockReset().mockResolvedValue('data:image/png;base64,QR');
  });
  afterEach(() => vi.restoreAllMocks());

  it('shows the link in a read-only field, under a Share link heading', () => {
    render(<ShareLinkBanner url={URL_} formTitle="Customer feedback" />);
    expect(screen.getByRole('heading', { name: 'Share link' })).toBeInTheDocument();
    const field = screen.getByLabelText('Public link') as HTMLInputElement;
    expect(field.value).toBe(URL_);
    expect(field.readOnly).toBe(true);
  });

  it('copies the link, says Copied for a moment, then goes back to Copy link', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareLinkBanner url={URL_} formTitle="Customer feedback" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(URL_);
    expect(await screen.findByText('Copied')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith('Link copied to clipboard.', 'success');
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByText('Copy link')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('says so when the link cannot be copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) }, configurable: true });
    render(<ShareLinkBanner url={URL_} formTitle="Customer feedback" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not copy. Select the link and copy it by hand.', 'error'));
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });

  it('shows a QR code of the link, and downloads it under the form\'s name when clicked', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let name = '';
    const create = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, o?: ElementCreationOptions) => {
      const el = create(tag, o);
      if (tag === 'a') Object.defineProperty(el, 'download', { set: (v) => (name = v), get: () => name });
      return el;
    });
    render(<ShareLinkBanner url={URL_} formTitle="Customer Feedback #1" />);
    expect(await screen.findByAltText('QR code linking to the public form')).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(toDataURL).toHaveBeenCalledWith(URL_, expect.objectContaining({ margin: 1 }));
    await userEvent.click(screen.getByRole('button', { name: 'Download QR code' }));
    expect(click).toHaveBeenCalled();
    expect(name).toBe('customer-feedback--1-qr.png');
  });

  it('keeps the QR button off until the code is ready, and survives the code failing', async () => {
    toDataURL.mockRejectedValue(new Error('no encoder'));
    render(<ShareLinkBanner url={URL_} formTitle="Form" />);
    expect(screen.getByRole('button', { name: 'Download QR code' })).toBeDisabled();
    await waitFor(() => expect(toDataURL).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Download QR code' })).toBeDisabled();
  });
});
