import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from '@/components/ui/FilterChips';

const chips = [
  { id: 'all', label: 'All', count: 77 },
  { id: 'unread', label: 'Unread', count: 0 },
  { id: 'new', label: 'New' },
];

describe('FilterChips', () => {
  it('renders a labelled group with counts, including a zero, and omits a missing count', () => {
    render(<FilterChips chips={chips} activeId="all" onChange={vi.fn()} ariaLabel="Filter responses" />);
    expect(screen.getByRole('group', { name: 'Filter responses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 77' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unread 0' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument();
  });

  it('marks only the active chip as pressed', () => {
    render(<FilterChips chips={chips} activeId="unread" onChange={vi.fn()} ariaLabel="f" />);
    expect(screen.getByRole('button', { name: 'Unread 0' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All 77' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'New' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked chip id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterChips chips={chips} activeId="all" onChange={onChange} ariaLabel="f" />);
    await user.click(screen.getByRole('button', { name: 'New' }));
    expect(onChange).toHaveBeenCalledWith('new');
  });

  it('renders no buttons for an empty list', () => {
    render(<FilterChips chips={[]} activeId="" onChange={vi.fn()} ariaLabel="f" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
