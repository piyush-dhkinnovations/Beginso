import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { FieldCard } from '@/components/form-builder/FieldCard';
import { makeField } from './builderTestUtils';
import type { FormField } from '@/types/form';

function setup(field: FormField, over: Partial<React.ComponentProps<typeof FieldCard>> = {}) {
  const h = {
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onUpdate: vi.fn(),
    onUpdateOptions: vi.fn(),
    onAddLogicRule: vi.fn(),
    onUpdateLogicRule: vi.fn(),
    onDeleteLogicRule: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
  };
  const utils = render(
    <DndContext>
      <SortableContext items={[field.fieldId]}>
        <FieldCard field={field} allFields={[field]} isActive={false} {...h} {...over} />
      </SortableContext>
    </DndContext>
  );
  return { ...h, ...utils };
}

describe('FieldCard', () => {
  it('shows the label, type name and live preview', () => {
    setup(makeField('email', { label: 'Work email' }));
    expect(screen.getByRole('button', { name: 'Select Work email field' })).toBeInTheDocument();
    expect(screen.getByText('Work email')).toBeInTheDocument();
    expect(screen.getByText(/^Email/)).toBeInTheDocument();
    expect(screen.getByText('name@example.com')).toBeInTheDocument();
  });

  it('shows option counts (singular and plural) and the Required marker', () => {
    const { unmount } = setup(makeField('dropdown', { options: ['A'], required: true } as never));
    expect(screen.getByText(/1 option(?!s)/)).toBeInTheDocument();
    expect(screen.getByText(/Required/)).toBeInTheDocument();
    unmount();
    setup(makeField('dropdown', { options: ['A', 'B', 'C'] } as never));
    expect(screen.getByText(/3 options/)).toBeInTheDocument();
    expect(screen.queryByText(/Required/)).not.toBeInTheDocument();
  });

  it('clicking the card selects it and reflects aria-pressed', async () => {
    const f = makeField('short_text', { label: 'Q' });
    const { onSelect } = setup(f);
    const card = screen.getByRole('button', { name: 'Select Q field' });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('Duplicate and Delete buttons act without selecting the card', async () => {
    const { onSelect, onDuplicate, onDelete } = setup(makeField('short_text'));
    await userEvent.click(screen.getByTitle('Duplicate Field'));
    await userEvent.click(screen.getByTitle('Delete Field'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('an inactive card shows no inline editor', () => {
    setup(makeField('short_text'));
    expect(screen.queryByText('Conditional Logic')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Field label')).not.toBeInTheDocument();
  });

  it('an active card expands the field editor and the logic editor', () => {
    setup(makeField('short_text', { label: 'Q' }), { isActive: true });
    expect(screen.getByPlaceholderText('Field label')).toHaveValue('Q');
    expect(screen.getByText('Conditional Logic')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Q field' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Delete / Backspace on the active card deletes it', () => {
    const { onDelete } = setup(makeField('short_text', { label: 'Q' }), { isActive: true });
    const card = screen.getByRole('button', { name: 'Select Q field' });
    fireEvent.keyDown(card, { key: 'Delete' });
    fireEvent.keyDown(card, { key: 'Backspace' });
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it('Alt+Arrow moves the active card; plain arrows and inactive cards do nothing', () => {
    const f = makeField('short_text', { label: 'Q' });
    const { onMoveUp, onMoveDown, onDelete, unmount } = setup(f, { isActive: true });
    const card = screen.getByRole('button', { name: 'Select Q field' });
    fireEvent.keyDown(card, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(card, { key: 'ArrowDown', altKey: true });
    fireEvent.keyDown(card, { key: 'ArrowDown' });
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
    unmount();

    const inactive = setup(f, { isActive: false });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Select Q field' }), { key: 'Delete' });
    expect(inactive.onDelete).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('Alt+Arrow is ignored at the ends of the list (no handler)', () => {
    const { onDelete } = setup(makeField('short_text', { label: 'Q' }), { isActive: true, onMoveUp: undefined, onMoveDown: undefined });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Select Q field' }), { key: 'ArrowUp', altKey: true });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('reorder mode swaps Duplicate/Delete for Up/Down buttons and never expands the editor', async () => {
    const { onMoveUp, onMoveDown } = setup(makeField('short_text', { label: 'Q' }), { reorderMode: true, isActive: true });
    expect(screen.queryByTitle('Delete Field')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Field label')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Move Q up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move Q down' }));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it('in reorder mode the end rows keep a focusable button that is aria-disabled and does nothing', async () => {
    setup(makeField('short_text', { label: 'Q' }), { reorderMode: true, onMoveUp: undefined });
    const up = screen.getByRole('button', { name: 'Move Q up' });
    expect(up).toHaveAttribute('aria-disabled', 'true');
    expect(up).not.toBeDisabled();
    await userEvent.click(up);
  });

  it('exposes a labelled drag handle', () => {
    setup(makeField('short_text', { label: 'Q' }));
    expect(screen.getByLabelText('Reorder Q. Press Space, then arrow keys, then Space.')).toBeInTheDocument();
  });

  it('renders a dashed drop indicator above or below when a toolbox field hovers', () => {
    const above = setup(makeField('short_text'), { insertIndicator: 'above' });
    expect(above.container.firstElementChild?.firstElementChild).toHaveClass('border-dashed');
    above.unmount();
    const below = setup(makeField('short_text'), { insertIndicator: 'below' });
    expect(below.container.firstElementChild?.lastElementChild).toHaveClass('border-dashed');
    below.unmount();
    const none = setup(makeField('short_text'));
    expect(none.container.querySelector('.border-dashed')).toBeNull();
  });
});
