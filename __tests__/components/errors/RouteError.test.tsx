import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteError } from '@/components/errors/RouteError';

describe('RouteError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is an alert with a friendly message and never shows the error message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<RouteError error={new Error('secret db password')} retry={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText(/secret db password/)).not.toBeInTheDocument();
  });

  it('calls retry from Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<RouteError error={new Error('x')} retry={retry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('links home to /dashboard by default and to a custom href', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(<RouteError error={new Error('x')} retry={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/dashboard');
    rerender(<RouteError error={new Error('x')} retry={vi.fn()} homeHref="/w/acme" />);
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/w/acme');
  });

  it('shows the digest as a support reference and logs only the digest', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('private detail'), { digest: 'abc123' });
    render(<RouteError error={error} retry={vi.fn()} />);
    expect(screen.getByText('Reference: abc123')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('Route error', 'abc123');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('private detail');
  });

  it('omits the reference line and logs a placeholder without a digest', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<RouteError error={new Error('x')} retry={vi.fn()} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('Route error', '(no digest)');
  });
});
