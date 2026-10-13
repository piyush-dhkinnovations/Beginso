import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldLogicEditor } from '@/components/form-builder/FieldLogicEditor';
import { makeField } from './builderTestUtils';
import type { FormField, LogicRule } from '@/types/form';

function setup(field: FormField, allFields: FormField[]) {
  const h = { onAddRule: vi.fn(), onUpdateRule: vi.fn(), onDeleteRule: vi.fn() };
  render(<FieldLogicEditor field={field} allFields={allFields} {...h} />);
  return h;
}

const ruleFor = (source: FormField, target: FormField, value = 'Yes', action: 'show' | 'hide' = 'show'): LogicRule => ({
  condition: { fieldId: source.fieldId, operator: 'equals', value },
  action,
  targetFieldId: target.fieldId,
});

describe('FieldLogicEditor', () => {
  it('starts collapsed with no rules, and the switch reveals the editor', async () => {
    const target = makeField('short_text', { label: 'Target' });
    const other = makeField('short_text', { label: 'Other' });
    setup(target, [target, other]);
    const toggle = screen.getByRole('switch', { name: 'Conditional logic' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole('button', { name: /Add condition/ })).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Add condition/ })).toBeEnabled();
  });

  it('starts expanded and lists a rule that targets this field (read from the source field)', () => {
    const target = makeField('short_text', { label: 'Target' });
    const source = makeField('yes_no', { label: 'Subscribe?' });
    source.logicRules = [ruleFor(source, target, 'Yes', 'hide')];
    setup(target, [source, target]);
    expect(screen.getByRole('switch', { name: 'Conditional logic' })).toBeChecked();
    expect(screen.getByText(/Subscribe\? equals/)).toHaveTextContent('IF Subscribe? equals ‘Yes’ THEN HIDE this field');
  });

  it('does not list rules aimed at other fields', () => {
    const target = makeField('short_text');
    const other = makeField('short_text');
    const source = makeField('short_text');
    source.logicRules = [ruleFor(source, other)];
    setup(target, [source, target, other]);
    expect(screen.queryByText(/THEN/)).not.toBeInTheDocument();
  });

  it('warns when the rule source field was deleted', () => {
    const target = makeField('short_text');
    const source = makeField('short_text', { deleted: true });
    source.logicRules = [ruleFor(source, target)];
    setup(target, [source, target]);
    expect(screen.getByText(/Source field deleted/)).toBeInTheDocument();
  });

  it('Add condition is disabled with an explanation when there is no other field', async () => {
    const target = makeField('short_text');
    setup(target, [target]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    const add = screen.getByRole('button', { name: /Add condition/ });
    expect(add).toBeDisabled();
    expect(add).toHaveAttribute('title', 'Add another field to create a condition.');
  });

  it('upload and signature fields cannot be condition sources', async () => {
    const target = makeField('short_text');
    const file = makeField('file_upload', { label: 'FileF' });
    const img = makeField('image_upload', { label: 'ImgF' });
    const sig = makeField('signature', { label: 'SigF' });
    const ok = makeField('short_text', { label: 'OkF' });
    setup(target, [target, file, img, sig, ok]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['OkF']);
  });

  it('Save is disabled until a non-blank value exists; saving adds the rule to the SOURCE field', async () => {
    const target = makeField('short_text', { label: 'Target' });
    const source = makeField('short_text', { label: 'Source' });
    const h = setup(target, [target, source]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    const save = screen.getByRole('button', { name: 'Save condition' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Value to match'), '   ');
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Value to match'), ' hello ');
    await userEvent.click(screen.getByRole('button', { name: 'HIDE' }));
    await userEvent.click(save);
    expect(h.onAddRule).toHaveBeenCalledWith(source.fieldId, {
      condition: { fieldId: source.fieldId, operator: 'equals', value: 'hello' },
      action: 'hide',
      targetFieldId: target.fieldId,
    });
    expect(screen.queryByRole('button', { name: 'Save condition' })).not.toBeInTheDocument();
  });

  it('a choice source offers its options in a dropdown instead of free text', async () => {
    const target = makeField('short_text');
    const source = makeField('dropdown', { label: 'Pick', options: ['Red', 'Blue'] } as never);
    const h = setup(target, [target, source]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    expect(screen.queryByPlaceholderText('Value to match')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByDisplayValue('Select a value'), 'Blue');
    await userEvent.click(screen.getByRole('button', { name: 'Save condition' }));
    expect(h.onAddRule).toHaveBeenCalledWith(source.fieldId, expect.objectContaining({ condition: expect.objectContaining({ value: 'Blue' }), action: 'show' }));
  });

  it('changing the source field clears the typed value', async () => {
    const target = makeField('short_text');
    const a = makeField('short_text', { label: 'A' });
    const b = makeField('short_text', { label: 'B' });
    setup(target, [target, a, b]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    await userEvent.type(screen.getByPlaceholderText('Value to match'), 'x');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'B');
    expect(screen.getByPlaceholderText('Value to match')).toHaveValue('');
  });

  it('Cancel closes the form without saving', async () => {
    const target = makeField('short_text');
    const other = makeField('short_text');
    const h = setup(target, [target, other]);
    await userEvent.click(screen.getByRole('switch', { name: 'Conditional logic' }));
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(h.onAddRule).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Add condition/ })).toBeInTheDocument();
  });

  it('editing an existing rule pre-fills it and calls onUpdateRule with the old and new position', async () => {
    const target = makeField('short_text', { label: 'Target' });
    const source = makeField('short_text', { label: 'Source' });
    source.logicRules = [ruleFor(source, target, 'abc', 'hide')];
    const h = setup(target, [source, target]);
    await userEvent.click(screen.getByRole('button', { name: 'Edit condition' }));
    expect(screen.getByPlaceholderText('Value to match')).toHaveValue('abc');
    const input = screen.getByPlaceholderText('Value to match');
    await userEvent.clear(input);
    await userEvent.type(input, 'xyz');
    await userEvent.click(screen.getByRole('button', { name: 'Update condition' }));
    expect(h.onUpdateRule).toHaveBeenCalledWith(source.fieldId, 0, source.fieldId, {
      condition: { fieldId: source.fieldId, operator: 'equals', value: 'xyz' },
      action: 'hide',
      targetFieldId: target.fieldId,
    });
    expect(h.onAddRule).not.toHaveBeenCalled();
  });

  it('deleting a rule reports the source field and its rule index', async () => {
    const target = makeField('short_text');
    const source = makeField('short_text');
    const unrelated = ruleFor(source, makeField('short_text'));
    source.logicRules = [unrelated, ruleFor(source, target)];
    const h = setup(target, [source, target]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete condition' }));
    expect(h.onDeleteRule).toHaveBeenCalledWith(source.fieldId, 1);
  });
});
