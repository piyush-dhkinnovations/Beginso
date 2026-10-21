import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { Canvas } from '@/components/form-builder/Canvas';
import { makeField } from './builderTestUtils';
import type { FormField } from '@/types/form';

function setup(fields: FormField[], over: Partial<React.ComponentProps<typeof Canvas>> = {}) {
  const h = {
    onPageTitleChange: vi.fn(),
    onPageDescriptionChange: vi.fn(),
    onFieldSelect: vi.fn(),
    onFieldDelete: vi.fn(),
    onFieldDuplicate: vi.fn(),
    onFieldReorder: vi.fn(),
    onFieldDeselect: vi.fn(),
    onFieldUpdate: vi.fn(),
    onFieldUpdateOptions: vi.fn(),
    onAddLogicRule: vi.fn(),
    onUpdateLogicRule: vi.fn(),
    onDeleteLogicRule: vi.fn(),
  };
  const utils = render(
    <DndContext>
      <Canvas fields={fields} activePageId="page-1" pageTitle="Page title" pageDescription="" activeFieldId={null} {...h} {...over} />
    </DndContext>
  );
  return { ...h, ...utils };
}

describe('Canvas', () => {
  it('shows the empty state when the active page has no fields', () => {
    setup([]);
    expect(screen.getByText('Start building your form')).toBeInTheDocument();
    expect(screen.getByText('0 fields')).toBeInTheDocument();
  });

  it('while a toolbox item is over the canvas the empty state invites a drop', () => {
    setup([], { isToolboxOver: true });
    expect(screen.getByText('Release to drop the field here!')).toBeInTheDocument();
  });

  it('shows only non-deleted fields on the active page', () => {
    const a = makeField('short_text', { label: 'Mine' });
    const gone = makeField('short_text', { label: 'Removed', deleted: true });
    const other = makeField('short_text', { label: 'Elsewhere', pageId: 'page-2' });
    setup([a, gone, other]);
    expect(screen.getByText('Mine')).toBeInTheDocument();
    expect(screen.queryByText('Removed')).not.toBeInTheDocument();
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();
    expect(screen.getByText('1 field')).toBeInTheDocument();
  });

  it('selecting a card reports its id', async () => {
    const a = makeField('short_text', { label: 'Mine' });
    const { onFieldSelect } = setup([a]);
    await userEvent.click(screen.getByRole('button', { name: 'Select Mine field' }));
    expect(onFieldSelect).toHaveBeenCalledWith(a.fieldId);
  });

  it('clicking the card that is already open closes it', async () => {
    const a = makeField('short_text', { label: 'Mine' });
    const { onFieldSelect, onFieldDeselect } = setup([a], { activeFieldId: a.fieldId });
    await userEvent.click(screen.getByRole('button', { name: 'Select Mine field' }));
    expect(onFieldDeselect).toHaveBeenCalledTimes(1);
    expect(onFieldSelect).not.toHaveBeenCalled();
  });

  it('clicking the canvas background deselects, clicking a card does not', async () => {
    const a = makeField('short_text', { label: 'Mine' });
    const { onFieldDeselect } = setup([a]);
    await userEvent.click(screen.getByRole('button', { name: 'Select Mine field' }));
    expect(onFieldDeselect).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('main'));
    expect(onFieldDeselect).toHaveBeenCalledTimes(1);
  });

  it('Duplicate / Delete route the field id', async () => {
    const a = makeField('short_text');
    const { onFieldDuplicate, onFieldDelete } = setup([a]);
    await userEvent.click(screen.getByTitle('Duplicate Field'));
    await userEvent.click(screen.getByTitle('Delete Field'));
    expect(onFieldDuplicate).toHaveBeenCalledWith(a.fieldId);
    expect(onFieldDelete).toHaveBeenCalledWith(a.fieldId);
  });

  it('the active field is expanded for editing', () => {
    const a = makeField('short_text', { label: 'Mine' });
    setup([a], { activeFieldId: a.fieldId });
    expect(screen.getByPlaceholderText('Field label')).toHaveValue('Mine');
  });

  it('editing the page title and description is forwarded', async () => {
    const { onPageTitleChange, onPageDescriptionChange } = setup([]);
    const title = screen.getByLabelText('Page title (shown to respondents)');
    await userEvent.type(title, '!');
    await userEvent.tab();
    expect(onPageTitleChange).toHaveBeenCalledWith('Page title!');
    await userEvent.type(screen.getByPlaceholderText('Add a short description for respondents…'), 'Hello');
    await userEvent.tab();
    expect(onPageDescriptionChange).toHaveBeenCalledWith('Hello');
  });

  describe('reorder mode', () => {
    const fields = () => [makeField('short_text', { label: 'First' }), makeField('short_text', { label: 'Second' }), makeField('short_text', { label: 'Third' })];

    it('Move down swaps with the next field and announces the new position', async () => {
      const [a, b, c] = fields();
      const { onFieldReorder } = setup([a, b, c], { isReordering: true });
      await userEvent.click(screen.getByRole('button', { name: 'Move First down' }));
      expect(onFieldReorder).toHaveBeenCalledWith(a.fieldId, b.fieldId);
      expect(screen.getByText('Moved First to position 2 of 3')).toBeInTheDocument();
    });

    it('Move up swaps with the previous field', async () => {
      const [a, b, c] = fields();
      const { onFieldReorder } = setup([a, b, c], { isReordering: true });
      await userEvent.click(screen.getByRole('button', { name: 'Move Third up' }));
      expect(onFieldReorder).toHaveBeenCalledWith(c.fieldId, b.fieldId);
      expect(screen.getByText('Moved Third to position 2 of 3')).toBeInTheDocument();
    });

    it('the first row cannot move up and the last cannot move down', async () => {
      const [a, b, c] = fields();
      const { onFieldReorder } = setup([a, b, c], { isReordering: true });
      await userEvent.click(screen.getByRole('button', { name: 'Move First up' }));
      await userEvent.click(screen.getByRole('button', { name: 'Move Third down' }));
      expect(onFieldReorder).not.toHaveBeenCalled();
    });

    it('Alt+ArrowDown on the active card also reorders', () => {
      const [a, b] = fields();
      const { onFieldReorder } = setup([a, b], { activeFieldId: a.fieldId });
      fireEvent.keyDown(screen.getByRole('button', { name: 'Select First field' }), { key: 'ArrowDown', altKey: true });
      expect(onFieldReorder).toHaveBeenCalledWith(a.fieldId, b.fieldId);
    });
  });
});
