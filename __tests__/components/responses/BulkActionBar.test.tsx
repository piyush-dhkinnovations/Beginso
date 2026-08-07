/**
 * __tests__/components/responses/BulkActionBar.test.tsx
 * Feature: sprint-4-responses
 * Tests: BulkActionBar — null when no selection, count label, callbacks, disabled while loading
 * Requirements: 7.1-7.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '@/components/responses/BulkActionBar';

const baseProps = {
  onMarkInProgress: vi.fn(),
  onMarkCompleted: vi.fn(),
  onDeleteSelected: vi.fn(),
  isLoading: false,
};

describe('BulkActionBar', () => {
  it('renders null when count is 0', () => {
    const { container } = render(<BulkActionBar {...baseProps} count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the selected count', () => {
    render(<BulkActionBar {...baseProps} count={4} />);
    expect(screen.getByText('4 selected')).toBeInTheDocument();
  });

  it('fires all three callbacks', async () => {
    const user = userEvent.setup();
    const props = { ...baseProps, onMarkInProgress: vi.fn(), onMarkCompleted: vi.fn(), onDeleteSelected: vi.fn() };
    render(<BulkActionBar {...props} count={2} />);

    await user.click(screen.getByRole('button', { name: /Mark as In Progress/ }));
    await user.click(screen.getByRole('button', { name: 'Mark as Completed' }));
    await user.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(props.onMarkInProgress).toHaveBeenCalledOnce();
    expect(props.onMarkCompleted).toHaveBeenCalledOnce();
    expect(props.onDeleteSelected).toHaveBeenCalledOnce();
  });

  it('disables all action buttons when isLoading is true', () => {
    render(<BulkActionBar {...baseProps} count={2} isLoading />);
    expect(screen.getByRole('button', { name: /Mark as In Progress/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark as Completed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled();
  });

  it('shows the spinner only on the active bulk action', () => {
    render(<BulkActionBar {...baseProps} count={2} isLoading loadingAction="delete" />);

    const progress = screen.getByRole('button', { name: 'Mark as In Progress' });
    const completed = screen.getByRole('button', { name: 'Mark as Completed' });
    const remove = screen.getByRole('button', { name: /Delete selected/ });
    expect(within(progress).queryByRole('status')).not.toBeInTheDocument();
    expect(within(completed).queryByRole('status')).not.toBeInTheDocument();
    expect(within(remove).getByRole('status')).toBeInTheDocument();
  });
});
