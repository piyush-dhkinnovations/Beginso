/**
 * __tests__/components/forms/BulkActionBar.test.tsx
 * sprint-10-events-migration, tasks.md 6.4.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '@/components/forms/BulkActionBar';

describe('BulkActionBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(<BulkActionBar count={0} isDeleting={false} onDeleteSelected={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the selected count and only a Delete action — no Archive, since Form.status has no archived value', () => {
    render(<BulkActionBar count={3} isDeleting={false} onDeleteSelected={vi.fn()} />);

    expect(screen.getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete selected/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument();
  });

  it('calls onDeleteSelected when clicked', async () => {
    const onDeleteSelected = vi.fn();
    render(<BulkActionBar count={2} isDeleting={false} onDeleteSelected={onDeleteSelected} />);

    await userEvent.click(screen.getByRole('button', { name: /Delete selected/ }));

    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it('disables the delete button while isDeleting is true', () => {
    render(<BulkActionBar count={2} isDeleting={true} onDeleteSelected={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Delete selected/ })).toBeDisabled();
  });
});
