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
  it('with no rules says the question is always shown and offers to add a condition', () => {
    const target = makeField('short_text', { label: 'Target' });
    const other = makeField('short_text', { label: 'Other' });
    setup(target, [target, other]);
    expect(screen.getByText(/This question is always shown/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add condition/ })).toBeEnabled();
  });

  it('lists a rule that targets this field (read from the source field)', () => {
    const target = makeField('short_text', { label: 'Target' });
    const source = makeField('yes_no', { label: 'Subscribe?' });
    source.logicRules = [ruleFor(source, target, 'Yes', 'hide')];
    setup(target, [source, target]);
    expect(screen.getByRole('listitem')).toHaveTextContent('Hide when Subscribe? is “Yes”');
    expect(screen.getByText('Hidden when this is true.')).toBeInTheDocument();
  });

  it('does not list rules aimed at other fields', () => {
    const target = makeField('short_text');
    const other = makeField('short_text');
    const source = makeField('short_text');
    source.logicRules = [ruleFor(source, other)];
    setup(target, [source, target, other]);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['OkF']);
  });

  it('does not offer a field this one already shows or hides as its trigger: that would be a loop (QA A4-004)', async () => {
    const a = makeField('short_text', { label: 'AField' });
    const b = makeField('short_text', { label: 'BField' });
    const c = makeField('short_text', { label: 'CField' });
    a.logicRules = [ruleFor(a, b)]; // A decides B
    b.logicRules = [ruleFor(b, c)]; // B decides C, so A also decides C
    setup(a, [a, b, c]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    // A's trigger could be B or C only if they did not depend on A; both do, so nothing is left to offer.
    expect(screen.queryAllByRole('option').map((o) => o.textContent)).toEqual([]);
  });

  it('Save is disabled until a non-blank value exists; saving adds the rule to the SOURCE field', async () => {
    const target = makeField('short_text', { label: 'Target' });
    const source = makeField('short_text', { label: 'Source' });
    const h = setup(target, [target, source]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    const save = screen.getByRole('button', { name: 'Save condition' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Type the answer'), '   ');
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText('Type the answer'), ' hello ');
    await userEvent.click(screen.getByRole('radio', { name: 'Hide' }));
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
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    expect(screen.queryByPlaceholderText('Type the answer')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'is' }), 'Blue');
    await userEvent.click(screen.getByRole('button', { name: 'Save condition' }));
    expect(h.onAddRule).toHaveBeenCalledWith(source.fieldId, expect.objectContaining({ condition: expect.objectContaining({ value: 'Blue' }), action: 'show' }));
  });

  it('changing the source field clears the typed value', async () => {
    const target = makeField('short_text');
    const a = makeField('short_text', { label: 'A' });
    const b = makeField('short_text', { label: 'B' });
    setup(target, [target, a, b]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    await userEvent.type(screen.getByPlaceholderText('Type the answer'), 'x');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'When the answer to' }), 'B');
    expect(screen.getByPlaceholderText('Type the answer')).toHaveValue('');
  });

  it('Cancel closes the form without saving', async () => {
    const target = makeField('short_text');
    const other = makeField('short_text');
    const h = setup(target, [target, other]);
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
    expect(screen.getByPlaceholderText('Type the answer')).toHaveValue('abc');
    const input = screen.getByPlaceholderText('Type the answer');
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

  it('several conditions are listed with "or", and a further one can always be added', async () => {
    const target = makeField('short_text');
    const source = makeField('dropdown', { label: 'Plan', options: ['Free', 'Pro'] } as never);
    source.logicRules = [ruleFor(source, target, 'Free'), ruleFor(source, target, 'Pro')];
    const h = setup(target, [source, target]);
    expect(screen.getByText('Shown when any one of these is true. Hidden otherwise.')).toBeInTheDocument();
    expect(screen.getByText('or')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add another condition' }));
    expect(screen.getByRole('radio', { name: 'Show' })).toBeChecked();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'is' }), 'Pro');
    await userEvent.click(screen.getByRole('button', { name: 'Save condition' }));
    expect(h.onAddRule).toHaveBeenCalledTimes(1);
  });

  it('says what mixed Show and Hide conditions add up to', () => {
    const target = makeField('short_text');
    const source = makeField('short_text');
    source.logicRules = [ruleFor(source, target, 'a', 'show'), ruleFor(source, target, 'b', 'hide')];
    setup(target, [source, target]);
    expect(screen.getByText('Shown when a “Show” condition is true and no “Hide” condition is.')).toBeInTheDocument();
    expect(screen.queryByText('or')).not.toBeInTheDocument();
  });

  it('a required question cannot be given a Hide condition, which the server would refuse', async () => {
    const target = makeField('short_text', { required: true });
    const other = makeField('short_text');
    setup(target, [target, other]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    await userEvent.type(screen.getByPlaceholderText('Type the answer'), 'x');
    await userEvent.click(screen.getByRole('radio', { name: 'Hide' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A required question cannot be hidden');
    expect(screen.getByRole('button', { name: 'Save condition' })).toBeDisabled();
  });

  it('warns when an existing Hide condition sits on a required question', () => {
    const target = makeField('short_text', { required: true });
    const source = makeField('short_text');
    source.logicRules = [ruleFor(source, target, 'a', 'hide')];
    setup(target, [source, target]);
    expect(screen.getByRole('alert')).toHaveTextContent('the form cannot be saved');
  });

  it.each([
    ['yes_no', 'No'],
    ['rating', '4'],
  ] as const)('a %s source offers its answers as a list', async (type, answer) => {
    const target = makeField('short_text');
    const source = makeField(type);
    const h = setup(target, [target, source]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'is' }), answer);
    await userEvent.click(screen.getByRole('button', { name: 'Save condition' }));
    expect(h.onAddRule).toHaveBeenCalledWith(source.fieldId, expect.objectContaining({ condition: expect.objectContaining({ value: answer }) }));
  });

  it('a date source asks with a date picker', async () => {
    const target = makeField('short_text');
    const source = makeField('date');
    setup(target, [target, source]);
    await userEvent.click(screen.getByRole('button', { name: /Add condition/ }));
    expect(screen.getByLabelText('is')).toHaveAttribute('type', 'date');
  });
});
