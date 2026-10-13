import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterMenu } from '@/components/ui/FilterMenu';

const options = [{ id: 'a', label: 'Alice' }, { id: 'b', label: 'Bob' }];

function setup(props: Partial<React.ComponentProps<typeof FilterMenu>> = {}) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  render(<FilterMenu label="Assignee" options={options} onSelect={onSelect} onClear={onClear} {...props} />);
  return { onSelect, onClear };
}

describe('FilterMenu', () => {
  it('shows just the label when nothing is selected', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Assignee' })).toBeInTheDocument();
  });

  it('shows the selected option label on the button', () => {
    setup({ selectedIds: ['b'] });
    expect(screen.getByRole('button', { name: 'Assignee: Bob' })).toBeInTheDocument();
  });

  it('prefers an explicit valueLabel', () => {
    setup({ selectedIds: ['b'], valueLabel: 'Robert' });
    expect(screen.getByRole('button', { name: 'Assignee: Robert' })).toBeInTheDocument();
  });

  it('falls back to the plain label when the selected id is unknown', () => {
    setup({ selectedIds: ['zzz'] });
    expect(screen.getByRole('button', { name: 'Assignee' })).toBeInTheDocument();
  });

  it('lists Any plus the options, and selecting calls onSelect', async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole('button', { name: 'Assignee' }));
    expect(screen.getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Any', 'Alice', 'Bob']);
    await user.click(screen.getByRole('menuitem', { name: 'Alice' }));
    expect(onSelect).toHaveBeenCalledWith('a');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('the Any item calls onClear and can be relabelled', async () => {
    const user = userEvent.setup();
    const { onClear } = setup({ clearLabel: 'Everyone', selectedIds: ['a'] });
    await user.click(screen.getByRole('button', { name: 'Assignee: Alice' }));
    await user.click(screen.getByRole('menuitem', { name: 'Everyone' }));
    expect(onClear).toHaveBeenCalled();
  });
});
