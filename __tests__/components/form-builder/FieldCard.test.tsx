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

  it('a closed card marks a required question, and one shown by a condition', () => {
    const { unmount } = setup(makeField('short_text', { required: true }));
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('Conditional')).not.toBeInTheDocument();
    unmount();

    const target = makeField('short_text');
    const source = makeField('short_text');
    source.logicRules = [{ condition: { fieldId: source.fieldId, operator: 'equals', value: 'a' }, action: 'show', targetFieldId: target.fieldId }];
    setup(target, { allFields: [source, target] });
    expect(screen.getByText('Conditional')).toBeInTheDocument();
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
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
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Field label')).not.toBeInTheDocument();
  });

  it('an active card opens on the Content tab, with the change-type icon and the Required switch', () => {
    setup(makeField('short_text', { label: 'Q' }), { isActive: true });
    expect(screen.getByRole('tab', { name: 'Content' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByPlaceholderText('Field label')).toHaveValue('Q');
    expect(screen.getByRole('button', { name: 'Change the type of Q' })).toHaveTextContent('');
    expect(screen.getByRole('switch', { name: 'Required' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Select Q field' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('the Required switch updates the question', async () => {
    const f = makeField('short_text');
    const { onUpdate } = setup(f, { isActive: true });
    await userEvent.click(screen.getByRole('switch', { name: 'Required' }));
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { required: true });
  });

  it('Validation and Show or hide are tabs of their own', async () => {
    setup(makeField('short_text'), { isActive: true });
    expect(screen.queryByRole('button', { name: /Add condition/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Validation' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Max length');
    await userEvent.click(screen.getByRole('tab', { name: 'Show or hide' }));
    expect(screen.getByRole('button', { name: /Add condition/ })).toBeInTheDocument();
  });

  it('a type with nothing to limit has no Validation tab', () => {
    setup(makeField('signature'), { isActive: true });
    expect(screen.queryByRole('tab', { name: 'Validation' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('Delete pressed on a button inside the card does not delete the question', () => {
    const { onDelete } = setup(makeField('short_text', { label: 'Q' }), { isActive: true });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Change the type of Q' }), { key: 'Delete' });
    expect(onDelete).not.toHaveBeenCalled();
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

  it('exposes a labelled drag handle', () => {
    setup(makeField('short_text', { label: 'Q' }));
    // Shown at every width: no breakpoint may hide it again.
    expect(screen.getByLabelText('Reorder Q. Press Space, then arrow keys, then Space.')).not.toHaveClass('hidden');
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
