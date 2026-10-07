/**
 * __tests__/components/responses/ResponsesToolbar.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.2 (2.2) — stage/assignee filters now come
 * from workspace data (`stages`/`members` props), not the removed status union (task 1.7).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesToolbar } from '@/components/responses/ResponsesToolbar';
import type { StageRef } from '@/types/stage';

const STAGES: StageRef[] = [
  { id: 's-new', name: 'Screening', colour: 'info', category: 'new' },
  { id: 's-completed', name: 'Offer', colour: 'success', category: 'completed' },
];

const baseProps = {
  search: '',
  filters: {},
  stages: STAGES,
  total: 3,
  onSearchChange: vi.fn(),
  onFilterChange: vi.fn(),
};

describe('ResponsesToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onSearchChange 300ms after typing stops', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearchChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onSearchChange={onSearchChange} />);

    await user.type(screen.getByPlaceholderText('Search responses…'), 'priya');
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).toHaveBeenCalledWith('priya');
  });

  it('shows a clear button when the input is non-empty and resets on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearchChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onSearchChange={onSearchChange} />);

    await user.type(screen.getByPlaceholderText('Search responses…'), 'x');
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);

    expect(screen.getByPlaceholderText('Search responses…')).toHaveValue('');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('lists stages from data — never a hardcoded label — and fires onFilterChange with the stage id', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onFilterChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole('button', { name: /filter/i }));
    const select = screen.getByLabelText('Stage');
    expect(screen.getByRole('option', { name: 'Screening' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Offer' })).toBeInTheDocument();

    await user.selectOptions(select, 's-completed');
    expect(onFilterChange).toHaveBeenCalledWith({ stageId: 's-completed' });
  });

  it('hides the assignee filter when members is undefined (personal shell, OQ-9)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ResponsesToolbar {...baseProps} members={undefined} />);
    await user.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.queryByLabelText('Assignee')).not.toBeInTheDocument();
  });

  it('shows Unassigned and Me first in the assignee filter when members is given', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ResponsesToolbar {...baseProps} members={[]} />);
    await user.click(screen.getByRole('button', { name: /filter/i }));
    const select = screen.getByLabelText('Assignee') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options.slice(0, 3)).toEqual(['Everyone', 'Unassigned', 'Me']);
  });

  it('fires onFilterChange when the unread toggle changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onFilterChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onFilterChange={onFilterChange} />);

    await user.click(screen.getByRole('button', { name: /filter/i }));
    await user.click(screen.getByLabelText('Unread only'));
    expect(onFilterChange).toHaveBeenCalledWith({ unread: true });
  });

  it('shows an active-filter count badge on the trigger when a filter is applied', () => {
    render(<ResponsesToolbar {...baseProps} filters={{ unread: true, stageId: 's-new' }} />);
    expect(screen.getByRole('button', { name: /filter/i })).toHaveTextContent('2');
  });

  it('renders the count label in singular and plural form', () => {
    const { rerender } = render(<ResponsesToolbar {...baseProps} total={1} />);
    expect(screen.getByText('1 response')).toBeInTheDocument();

    rerender(<ResponsesToolbar {...baseProps} total={5} />);
    expect(screen.getByText('5 responses')).toBeInTheDocument();
  });
});
