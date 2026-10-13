import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinButton } from '@/components/forms/PinButton';

describe('PinButton', () => {
  it('offers to pin an unpinned form, with aria-pressed false', () => {
    render(<PinButton title="Survey" pinned={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Pin Survey' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('title', 'Pin to top');
  });

  it('offers to unpin a pinned form, with aria-pressed true', () => {
    render(<PinButton title="Survey" pinned onToggle={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'Unpin Survey' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('title', 'Unpin');
  });

  it('calls onToggle on click, but not while disabled', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<PinButton title="Survey" pinned={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<PinButton title="Survey" pinned={false} onToggle={onToggle} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
