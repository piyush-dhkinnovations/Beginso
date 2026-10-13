import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileBuildBar } from '@/components/form-builder/MobileBuildBar';

const props = { isReordering: false, canReorder: true, onAddField: vi.fn(), onToggleReorder: vi.fn() };

describe('MobileBuildBar', () => {
  it('Add field and Reorder fire their callbacks', async () => {
    const onAddField = vi.fn();
    const onToggleReorder = vi.fn();
    render(<MobileBuildBar {...props} onAddField={onAddField} onToggleReorder={onToggleReorder} />);
    await userEvent.click(screen.getByRole('button', { name: /Add field/ }));
    await userEvent.click(screen.getByRole('button', { name: /Reorder/ }));
    expect(onAddField).toHaveBeenCalledTimes(1);
    expect(onToggleReorder).toHaveBeenCalledTimes(1);
  });

  it('Reorder is disabled when there is nothing to reorder', () => {
    render(<MobileBuildBar {...props} canReorder={false} />);
    expect(screen.getByRole('button', { name: /Reorder/ })).toBeDisabled();
  });

  it('while reordering the toggle says Done, is pressed and stays enabled; Add field is disabled', () => {
    render(<MobileBuildBar {...props} isReordering canReorder={false} />);
    const done = screen.getByRole('button', { name: /Done/ });
    expect(done).toBeEnabled();
    expect(done).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Add field/ })).toBeDisabled();
  });
});
