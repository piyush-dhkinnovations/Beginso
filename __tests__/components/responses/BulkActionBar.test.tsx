/**
 * __tests__/components/responses/BulkActionBar.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.5 (5.1) — the two hardcoded "Mark as In
 * Progress"/"Mark as Completed" buttons are replaced by a stage picker sourced from workspace
 * data (task 1.8's compile-fix note); count/region/Delete/loading behaviour is unchanged.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '@/components/responses/BulkActionBar';
import type { StageRef } from '@/types/stage';

const STAGES: StageRef[] = [
  { id: 's-new', name: 'New', colour: 'info', category: 'new' },
  { id: 's-completed', name: 'Completed', colour: 'success', category: 'completed' },
];

const baseProps = {
  stages: STAGES,
  onChangeStage: vi.fn(),
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

  it('is a labelled region (requirements.md §11)', () => {
    render(<BulkActionBar {...baseProps} count={2} />);
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
  });

  it('fires onChangeStage with the selected stage id', async () => {
    const user = userEvent.setup();
    const onChangeStage = vi.fn();
    render(<BulkActionBar {...baseProps} onChangeStage={onChangeStage} count={2} />);

    await user.selectOptions(screen.getByLabelText('Change stage for selected responses'), 's-completed');
    expect(onChangeStage).toHaveBeenCalledWith('s-completed');
  });

  it('fires onDeleteSelected', async () => {
    const user = userEvent.setup();
    const onDeleteSelected = vi.fn();
    render(<BulkActionBar {...baseProps} onDeleteSelected={onDeleteSelected} count={2} />);

    await user.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(onDeleteSelected).toHaveBeenCalledOnce();
  });

  it('disables the stage picker and Delete button when isLoading is true', () => {
    render(<BulkActionBar {...baseProps} count={2} isLoading />);
    expect(screen.getByLabelText('Change stage for selected responses')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Delete selected/ })).toBeDisabled();
  });

  it('omits the stage picker when no stages are available yet, without crashing', () => {
    render(<BulkActionBar {...baseProps} stages={[]} count={2} />);
    expect(screen.queryByLabelText('Change stage for selected responses')).not.toBeInTheDocument();
  });

  // Sprint 11 5.3: the count must be announced when it changes, not just visible.
  it('the selected count is in an aria-live region, and the value updates on re-render', () => {
    const { rerender, container } = render(<BulkActionBar {...baseProps} count={2} />);
    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live).toHaveTextContent('2 selected');

    rerender(<BulkActionBar {...baseProps} count={5} />);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('5 selected');
  });
});
