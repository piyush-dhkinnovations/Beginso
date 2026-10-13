import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { V2Gallery } from '@/components/dev/v2/V2Gallery';

describe('V2Gallery', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));

  it('renders the prototype page with its sample content', () => {
    render(<V2Gallery />);
    expect(screen.getByRole('heading', { level: 1, name: 'Card prototype' })).toBeInTheDocument();
    expect(screen.getByText('71 responses are waiting for you')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Responses per day for the last 14 days/ })).toBeInTheDocument();
  });

  it('starts light and switches the document theme, restoring it on unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<V2Gallery />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    unmount();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
