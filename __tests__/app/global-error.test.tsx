import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalError from '@/app/global-error';

// GlobalError renders <html>/<body>; rendering them inside a div is invalid DOM, so React logs a warning. Silence it.
function mount(error: Error & { digest?: string }, retry = vi.fn()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const result = render(<GlobalError error={error} retry={retry} />, { container });
  return { retry, ...result };
}

describe('GlobalError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows an alert with a retry and a hard link home', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount(new Error('x'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  it('calls retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const { retry } = mount(new Error('x'));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows and logs only the digest, never the message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount(Object.assign(new Error('private detail'), { digest: 'd-42' }));
    expect(screen.getByText('Reference: d-42')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('Global error', 'd-42');
    expect(screen.queryByText(/private detail/)).not.toBeInTheDocument();
  });

  it('omits the reference without a digest', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mount(new Error('x'));
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
