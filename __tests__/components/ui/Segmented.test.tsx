import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from '@/components/ui/Segmented';

const options = [{ id: 'table', label: 'Table' }, { id: 'board', label: 'Board' }, { id: 'chart', label: 'Chart' }];

describe('Segmented', () => {
  it('renders a labelled group of toggle buttons with the current one pressed', () => {
    render(<Segmented options={options} value="board" onChange={vi.fn()} ariaLabel="View" />);
    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the id of the clicked option, including the current one', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Segmented options={options} value="table" onChange={onChange} ariaLabel="View" />);
    await user.click(screen.getByRole('button', { name: 'Chart' }));
    expect(onChange).toHaveBeenLastCalledWith('chart');
    await user.click(screen.getByRole('button', { name: 'Table' }));
    expect(onChange).toHaveBeenLastCalledWith('table');
  });

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Segmented options={options} value="table" onChange={onChange} ariaLabel="View" />);
    await user.tab();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('board');
  });

  it('applies a custom className to the group', () => {
    render(<Segmented options={options} value="table" onChange={vi.fn()} ariaLabel="View" className="extra" />);
    expect(screen.getByRole('group')).toHaveClass('bg-segmented', 'extra');
  });
});
