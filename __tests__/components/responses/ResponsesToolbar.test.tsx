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

  describe('in the calendar view', () => {
    const views = [{ id: 'table', label: 'Table' }, { id: 'board', label: 'Board' }, { id: 'calendar', label: 'Calendar' }];
    const draw = (view: string) => render(<ResponsesToolbar {...baseProps} viewOptions={views} view={view} onViewChange={vi.fn()} />);

    it('has no Date filter and no all-months total (the calendar has its own month controls and count)', () => {
      draw('calendar');
      expect(screen.queryByRole('button', { name: 'Date' })).not.toBeInTheDocument();
      expect(screen.queryByText('3 responses')).not.toBeInTheDocument();
    });

    it('keeps search, the other filters and the view switcher', () => {
      draw('calendar');
      expect(screen.getByPlaceholderText('Search responses…')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show/ })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Responses view' })).toBeInTheDocument();
    });

    it.each(['table', 'board'])('still has the Date filter and the total in the %s view', (view) => {
      draw(view);
      expect(screen.getByRole('button', { name: 'Date' })).toBeInTheDocument();
      expect(screen.getByText('3 responses')).toBeInTheDocument();
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

  it('renders the count label in singular and plural form', () => {
    const { rerender } = render(<ResponsesToolbar {...baseProps} total={1} />);
    expect(screen.getByText('1 response')).toBeInTheDocument();

    rerender(<ResponsesToolbar {...baseProps} total={5} />);
    expect(screen.getByText('5 responses')).toBeInTheDocument();
  });
});
