/**
 * __tests__/components/responses/TagPicker.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.7 (7.1), task 2.5.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagPicker } from '@/components/responses/TagPicker';
import type { Tag } from '@/types/tag';

const TAGS: Tag[] = [
  { id: 't1', name: 'Hot lead', colour: 'success' },
  { id: 't2', name: 'Follow up', colour: 'info' },
];

describe('TagPicker', () => {
  it('renders selected tags as removable chips', () => {
    render(
      <TagPicker available={TAGS} selectedIds={['t1']} canCreate onAdd={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} />
    );
    expect(screen.getByText('Hot lead')).toBeInTheDocument();
    expect(screen.queryByText('Follow up')).not.toBeInTheDocument();
  });

  it('fires onRemove when a chip is removed', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <TagPicker available={TAGS} selectedIds={['t1']} canCreate onAdd={vi.fn()} onRemove={onRemove} onCreate={vi.fn()} />
    );
    await user.click(screen.getByLabelText('Remove tag Hot lead'));
    expect(onRemove).toHaveBeenCalledWith('t1');
  });

  it('opens the listbox and fires onAdd for a matching tag', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <TagPicker available={TAGS} selectedIds={[]} canCreate onAdd={onAdd} onRemove={vi.fn()} onCreate={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    await user.click(screen.getByRole('option', { name: 'Follow up' }));
    expect(onAdd).toHaveBeenCalledWith('t2');
  });

  it('offers inline create only when canCreate and no exact match exists', async () => {
    const user = userEvent.setup();
    render(
      <TagPicker available={TAGS} selectedIds={[]} canCreate onAdd={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    await user.type(screen.getByLabelText('Search tags'), 'Brand new');
    expect(screen.getByText('Create "Brand new"')).toBeInTheDocument();
  });

  it('never offers create when canCreate is false', async () => {
    const user = userEvent.setup();
    render(
      <TagPicker available={TAGS} selectedIds={[]} canCreate={false} onAdd={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: 'Add tag' }));
    await user.type(screen.getByLabelText('Search tags'), 'Brand new');
    expect(screen.queryByText('Create "Brand new"')).not.toBeInTheDocument();
  });

  it('Escape closes the listbox and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <TagPicker available={TAGS} selectedIds={[]} canCreate onAdd={vi.fn()} onRemove={vi.fn()} onCreate={vi.fn()} />
    );
    const trigger = screen.getByRole('button', { name: 'Add tag' });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
