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

  describe('in the calendar view', () => {
    const draw = (view: string) => render(<ResponsesToolbar {...baseProps} view={view} />);

    it('has no Date filter (the calendar has its own month controls)', () => {
      draw('calendar');
      expect(screen.queryByRole('button', { name: 'Date' })).not.toBeInTheDocument();
    });

    it('keeps search and the other filters, and leaves room for the own controls of the calendar', () => {
      draw('calendar');
      expect(screen.getByPlaceholderText('Search responses…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
      expect(document.getElementById('responses-toolbar-slot')).not.toBeNull();
    });

    it.each(['table', 'board'])('still has the Date filter in the %s view', (view) => {
      draw(view);
      expect(screen.getByRole('button', { name: 'Date' })).toBeInTheDocument();
    });
  });

  it('hides the Assignee button when members is undefined (personal shell, OQ-9)', () => {
    render(<ResponsesToolbar {...baseProps} members={undefined} />);
    expect(screen.queryByRole('button', { name: /Assignee/ })).not.toBeInTheDocument();
  });

  it('offers Me and Unassigned first in the Assignee menu, then closes after a selection', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onFilterChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} members={[]} onFilterChange={onFilterChange} />);
    await user.click(screen.getByRole('button', { name: 'Assignee' }));
    const items = screen.getAllByRole('menuitem').map((i) => i.textContent);
    expect(items.slice(0, 3)).toEqual(['Anyone', 'Me', 'Unassigned']);

    await user.click(screen.getByRole('menuitem', { name: 'Unassigned' }));
    expect(onFilterChange).toHaveBeenCalledWith({ assigneeId: 'unassigned' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the active value on the button', () => {
    render(<ResponsesToolbar {...baseProps} members={[]} filters={{ assigneeId: 'me' }} />);
    expect(screen.getByRole('button', { name: 'Assignee: Me' })).toBeInTheDocument();
  });

  it('shows the Tags button only when the workspace has tags, and filters by the picked tag', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onFilterChange = vi.fn();
    const { rerender } = render(<ResponsesToolbar {...baseProps} tags={[]} onFilterChange={onFilterChange} />);
    expect(screen.queryByRole('button', { name: 'Tags' })).not.toBeInTheDocument();

    rerender(<ResponsesToolbar {...baseProps} tags={[{ id: 't1', name: 'VIP', colour: 'primary' }]} onFilterChange={onFilterChange} />);
    await user.click(screen.getByRole('button', { name: 'Tags' }));
    await user.click(screen.getByRole('menuitem', { name: 'VIP' }));
    expect(onFilterChange).toHaveBeenCalledWith({ tagIds: ['t1'] });
  });

  it('sets a date range from the Date menu', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onFilterChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onFilterChange={onFilterChange} />);
    await user.click(screen.getByRole('button', { name: 'Date' }));
    await user.click(screen.getByRole('menuitem', { name: 'Last 7 days' }));
    expect(onFilterChange).toHaveBeenCalledWith({ from: expect.any(String), to: undefined });
  });

  it('puts what it is given at its right end (the saved views and Save view)', () => {
    render(<ResponsesToolbar {...baseProps} trailing={<button>Save view</button>} />);
    expect(screen.getByRole('button', { name: 'Save view' }).parentElement).toHaveClass('ml-auto');
  });

  it('the Date menu ends with "Custom range…", which opens the two dates and applies them as one range', async () => {
    const onFilterChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onFilterChange={onFilterChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Date' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Custom range…' }));
    expect(screen.getByRole('dialog', { name: 'Pick a date range' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('From'), '2026-10-01');
    await userEvent.type(screen.getByLabelText('To'), '2026-10-15');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const patch = onFilterChange.mock.calls.at(-1)![0];
    expect(new Date(patch.from).getTime()).toBeLessThan(new Date(patch.to).getTime());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a filter button names its value right after the name: "Show: Similar responses only"', () => {
    render(<ResponsesToolbar {...baseProps} filters={{ duplicate: true }} />);
    expect(screen.getByRole('button', { name: 'Show: Similar responses only' })).toHaveTextContent(/^Show: Similar responses only$/);
  });
});
