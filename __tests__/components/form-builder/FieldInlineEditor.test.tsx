import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldInlineEditor } from '@/components/form-builder/FieldInlineEditor';
import { makeField } from './builderTestUtils';
import type { FormField } from '@/types/form';

function setup(field: FormField) {
  const onUpdate = vi.fn();
  const onUpdateOptions = vi.fn();
  const utils = render(<FieldInlineEditor field={field} onUpdate={onUpdate} onUpdateOptions={onUpdateOptions} />);
  return { onUpdate, onUpdateOptions, ...utils };
}

describe('FieldInlineEditor: common controls', () => {
  it('editing the label commits on blur, trimmed', async () => {
    const f = makeField('short_text', { label: 'Name' });
    const { onUpdate } = setup(f);
    const input = screen.getByPlaceholderText('Field label');
    await userEvent.clear(input);
    await userEvent.type(input, '  Full name  ');
    expect(onUpdate).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { label: 'Full name' });
  });

  it('Enter commits too', async () => {
    const f = makeField('short_text', { label: 'Name' });
    const { onUpdate } = setup(f);
    await userEvent.type(screen.getByPlaceholderText('Field label'), 'X{Enter}');
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { label: 'NameX' });
  });

  it('a blank label is not committed (a label is mandatory)', async () => {
    const f = makeField('short_text', { label: 'Name' });
    const { onUpdate } = setup(f);
    await userEvent.clear(screen.getByPlaceholderText('Field label'));
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { label: 'Name' });
  });

  it('an unchanged label does not fire an update', async () => {
    const f = makeField('short_text', { label: 'Name' });
    const { onUpdate } = setup(f);
    await userEvent.click(screen.getByPlaceholderText('Field label'));
    await userEvent.tab();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('help text may be cleared to empty', async () => {
    const f = makeField('short_text', { helpText: 'Hint' });
    const { onUpdate } = setup(f);
    await userEvent.clear(screen.getByPlaceholderText('Optional helper copy below the field'));
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { helpText: '' });
  });

  it('the Required switch reflects and toggles the flag', async () => {
    const f = makeField('short_text', { required: true });
    const { onUpdate } = setup(f);
    const sw = screen.getByRole('switch', { name: 'Required field' });
    expect(sw).toBeChecked();
    await userEvent.click(sw);
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { required: false });
  });

  it.each(['rating', 'yes_no', 'time', 'datetime', 'address', 'signature'] as const)('%s offers only label, help text and required', (type) => {
    setup(makeField(type));
    expect(screen.getByPlaceholderText('Field label')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Required field' })).toBeInTheDocument();
    expect(screen.queryByText('Placeholder text')).not.toBeInTheDocument();
  });
});

describe('FieldInlineEditor: text-like fields', () => {
  it('text fields have a placeholder control', async () => {
    const f = makeField('email');
    const { onUpdate } = setup(f);
    await userEvent.type(screen.getByPlaceholderText('Hint shown inside the field'), 'you@x.com');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { placeholder: 'you@x.com' });
  });

  it('short and long text have a max length that is clamped to at least 1 and truncated', async () => {
    const f = makeField('short_text');
    const { onUpdate } = setup(f);
    const input = screen.getByPlaceholderText('No limit');
    await userEvent.type(input, '0');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { maxLength: 1 });
    await userEvent.clear(input);
    await userEvent.type(input, '12.9');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { maxLength: 12 });
  });

  it('clearing max length removes the limit', async () => {
    const f = makeField('long_text', { maxLength: 50 } as never);
    const { onUpdate } = setup(f);
    await userEvent.clear(screen.getByPlaceholderText('No limit'));
    await userEvent.tab();
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { maxLength: undefined });
  });

  it('email has no max length control', () => {
    setup(makeField('email'));
    expect(screen.queryByPlaceholderText('No limit')).not.toBeInTheDocument();
  });

  it('number fields commit a min/max range on blur', async () => {
    const f = makeField('number');
    const { onUpdate } = setup(f);
    await userEvent.type(screen.getByLabelText('Min'), '1');
    await userEvent.type(screen.getByLabelText('Max'), '10');
    await userEvent.tab();
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { min: 1, max: 10 });
  });

  it('an inverted range is flagged live and never saved', async () => {
    const f = makeField('number');
    const { onUpdate } = setup(f);
    await userEvent.type(screen.getByLabelText('Min'), '20');
    await userEvent.type(screen.getByLabelText('Max'), '5');
    expect(screen.getByRole('alert')).toHaveTextContent('Min cannot be greater than max. This range is not saved.');
    await userEvent.tab();
    // Leaving Min (while Max was still empty) legitimately saved min only; the inverted pair never is.
    expect(onUpdate).not.toHaveBeenCalledWith(f.fieldId, expect.objectContaining({ max: 5 }));
  });

  it('an emptied range commits undefined bounds', async () => {
    const f = makeField('currency', { min: 1, max: 9 } as never);
    const { onUpdate } = setup(f);
    await userEvent.clear(screen.getByLabelText('Min'));
    await userEvent.clear(screen.getByLabelText('Max'));
    await userEvent.tab();
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { min: undefined, max: undefined });
  });

  it('currency fields pick a currency', async () => {
    const f = makeField('currency');
    const { onUpdate } = setup(f);
    const select = screen.getByRole('combobox', { name: 'Currency' });
    expect((select as HTMLSelectElement).value).toBe('INR');
    await userEvent.selectOptions(select, 'USD');
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { currency: 'USD' });
  });

  it('date fields commit From / To immediately and empty means undefined', () => {
    const f = makeField('date', { minDate: '2026-01-01' } as never);
    const { onUpdate } = setup(f);
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-12-31' } });
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { maxDate: '2026-12-31' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { minDate: undefined });
  });

  it('url fields choose preview style and display', async () => {
    const f = makeField('url');
    const { onUpdate } = setup(f);
    expect(screen.getByRole('radio', { name: /Rich preview/ })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: /Compact link/ }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { urlPreviewStyle: 'compact' });
    await userEvent.click(screen.getByRole('radio', { name: 'Inline with the answer' }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { urlDisplay: 'inline' });
    expect(screen.getByText('Links: rich preview, displayed as card.')).toBeInTheDocument();
  });
});

describe('FieldInlineEditor: choice fields', () => {
  it('shows the options editor and routes changes to onUpdateOptions', async () => {
    const f = makeField('dropdown', { options: ['A', 'B'] } as never);
    const { onUpdateOptions, onUpdate } = setup(f);
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /delete option/i })[0]);
    expect(onUpdateOptions).toHaveBeenCalledWith(f.fieldId, ['B']);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('FieldInlineEditor: image upload', () => {
  it('shows defaults: top, original ratio, large, single image, 10 MB', () => {
    setup(makeField('image_upload'));
    expect(screen.getByRole('radio', { name: /Top of response/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Original ratio' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Large preview' })).toBeChecked();
    expect(screen.getByText('JPG, PNG or WebP · up to 10 MB each.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Maximum images')).not.toBeInTheDocument();
    expect(screen.getByText(/up to 1 image\./)).toBeInTheDocument();
  });

  it('each radio group writes its own key', async () => {
    const f = makeField('image_upload');
    const { onUpdate } = setup(f);
    await userEvent.click(screen.getByRole('radio', { name: 'Inline with the answer' }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { previewPosition: 'inline' });
    await userEvent.click(screen.getByRole('radio', { name: '1:1 square' }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { aspectRatio: '1:1' });
    await userEvent.click(screen.getByRole('radio', { name: 'Small thumbnail' }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { previewSize: 'small' });
  });

  it('allowing multiple reveals the max-images select (default 5) and writes numbers', async () => {
    const f = makeField('image_upload', { allowMultiple: true } as never);
    const { onUpdate } = setup(f);
    const select = screen.getByLabelText('Maximum images') as HTMLSelectElement;
    expect(select.value).toBe('5');
    await userEvent.selectOptions(select, '10');
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { maxImages: 10 });
  });

  it('the multiple-images switch writes allowMultiple', async () => {
    const f = makeField('image_upload');
    const { onUpdate } = setup(f);
    await userEvent.click(screen.getByRole('switch', { name: 'Allow multiple images' }));
    expect(onUpdate).toHaveBeenLastCalledWith(f.fieldId, { allowMultiple: true });
  });
});

describe('FieldInlineEditor: file upload', () => {
  it('shows the platform-enforced 25 MB limit and allowed types as read-only information', () => {
    setup(makeField('file_upload'));
    expect(screen.getByText('25 MB maximum file size')).toBeInTheDocument();
    expect(screen.getByText('Platform-enforced — cannot be changed.')).toBeInTheDocument();
    ['PDF', 'Word', 'Excel', 'Images', 'Video (MP4)', 'ZIP', 'Plain text'].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it('has no per-field size or type controls', () => {
    setup(makeField('file_upload'));
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /PDF|Word|Excel|ZIP/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/max.*size/i)).not.toBeInTheDocument();
  });

  it('still lets the label, help text and required flag be edited', async () => {
    const f = makeField('file_upload');
    const { onUpdate } = setup(f);
    await userEvent.click(screen.getByRole('switch', { name: 'Required field' }));
    expect(onUpdate).toHaveBeenCalledWith(f.fieldId, { required: true });
  });
});
