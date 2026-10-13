import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewStep, type ReviewStepProps } from '@/components/public-form/ReviewStep';
import type { FormField, FormPage } from '@/types/form';
import { makeField } from './fields/harness';

const pages = [
  { id: 'p1', title: 'About you', order: 0 },
  { id: 'p2', title: '', order: 1 },
  { id: 'p3', title: 'Empty page', order: 2 },
] as unknown as FormPage[];

const fields: FormField[] = [
  makeField({ fieldId: 'name', pageId: 'p1', label: 'Name', type: 'short_text', order: 0 }),
  makeField({ fieldId: 'secret', pageId: 'p1', label: 'Secret', type: 'short_text', order: 1 }),
  makeField({ fieldId: 'gone', pageId: 'p1', label: 'Deleted', type: 'short_text', order: 2, deleted: true }),
  makeField({ fieldId: 'rate', pageId: 'p2', label: 'Rating', type: 'rating', order: 0 }),
  makeField({ fieldId: 'cv', pageId: 'p2', label: 'CV', type: 'file_upload', order: 1 }),
];

function setup(over: Partial<ReviewStepProps> = {}) {
  const props: ReviewStepProps = {
    formTitle: 'Job form',
    pages,
    fields,
    hiddenFieldIds: new Set(['secret']),
    values: { name: 'Asha', rate: 4 },
    fileNames: { cv: 'cv.pdf' },
    renderField: (f) => <input aria-label={`edit-${f.fieldId}`} defaultValue="" />,
    validateField: vi.fn().mockResolvedValue(true),
    restoreField: vi.fn(),
    onBack: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    submitDisabled: false,
    submitError: null,
    primaryColor: '#123456',
    ...over,
  };
  render(<ReviewStep {...props} />);
  return props;
}

describe('ReviewStep summary', () => {
  it('groups answers into one section per page, with fallback titles, and skips empty pages', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Review your answers' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'About you' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Empty page' })).not.toBeInTheDocument();
  });

  it('omits hidden and deleted fields', () => {
    setup();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('formats answers by type and shows the chosen file name', () => {
    setup();
    expect(screen.getByText('Name').nextSibling).toHaveTextContent('Asha');
    expect(screen.getByText('Rating').nextSibling).toHaveTextContent('4 / 5');
    expect(screen.getByText('CV').nextSibling).toHaveTextContent('cv.pdf');
  });

  it.each<[Record<string, unknown>, Record<string, unknown>, string]>([
    [{ type: 'short_text' }, {}, '—'],
    [{ type: 'short_text' }, { x: '' }, '—'],
    [{ type: 'checkbox' }, { x: ['a', 'b'] }, 'a, b'],
    [{ type: 'checkbox' }, { x: [] }, '—'],
    [{ type: 'time' }, { x: '14:30' }, '2:30 PM'],
    [{ type: 'datetime' }, { x: '2026-09-25T10:30' }, '25 Sep 2026, 10:30 AM'],
    [{ type: 'currency', currency: 'USD' }, { x: '1234.5' }, '$1,234.50'],
    [{ type: 'address' }, { x: '1 Main\nPune\n\n411001' }, '1 Main, Pune, 411001'],
    [{ type: 'address' }, { x: '\n\n\n' }, '—'],
    [{ type: 'signature' }, { x: 'Asha Rao' }, 'Asha Rao'],
    [{ type: 'signature' }, { x: 'data:image/png;base64,AAAA' }, 'Drawn signature'],
    [{ type: 'signature' }, {}, '—'],
    [{ type: 'rating' }, {}, '—'],
    [{ type: 'image_upload' }, {}, '—'],
  ])('displays %j with %j as "%s"', (fieldProps, values, expected) => {
    setup({
      pages: [{ id: 'p1', title: 'P', order: 0 } as unknown as FormPage],
      fields: [makeField({ fieldId: 'x', label: 'Q', ...fieldProps })],
      hiddenFieldIds: new Set(),
      values: values as ReviewStepProps['values'],
      fileNames: {},
    });
    expect(screen.getByText('Q').nextSibling).toHaveTextContent(expected);
  });
});

describe('ReviewStep actions', () => {
  it('Back and Submit fire their callbacks', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Submit is disabled when submitDisabled is set, and everything is locked while submitting', () => {
    setup({ submitDisabled: true });
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  it('while submitting, Back and every Edit button are disabled and Submit announces progress', () => {
    setup({ isSubmitting: true, submitDisabled: true });
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Name' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submitting your response...' })).toBeDisabled();
  });

  it('shows the submit error as an alert', () => {
    setup({ submitError: 'Too many submissions' });
    expect(screen.getByRole('alert')).toHaveTextContent('Too many submissions');
  });

  it('preview mode replaces the buttons with a "nothing was submitted" note', () => {
    setup({ previewSubmitted: true });
    expect(screen.getByText('This is a preview — nothing was submitted.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });

  it('renders extra content above the buttons', () => {
    setup({ extra: <p>Responding as me@x.co</p> });
    expect(screen.getByText('Responding as me@x.co')).toBeInTheDocument();
  });
});

describe('ReviewStep inline editing', () => {
  it('Edit swaps the row for the shell-provided editor and locks Back/Submit/other Edit buttons', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    expect(screen.getByLabelText('edit-name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit Rating' })).toBeDisabled();
  });

  it('Save answer re-validates the field and closes the editor when it passes', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    expect(props.validateField).toHaveBeenCalledWith('name');
    await waitFor(() => expect(screen.queryByLabelText('edit-name')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Name' })).toHaveFocus());
  });

  it('Save answer keeps the editor open when validation fails', async () => {
    const props = setup({ validateField: vi.fn().mockResolvedValue(false) });
    await userEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save answer' }));
    await waitFor(() => expect(props.validateField).toHaveBeenCalled());
    expect(screen.getByLabelText('edit-name')).toBeInTheDocument();
  });

  it('Cancel restores the value the field had before the edit began', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.restoreField).toHaveBeenCalledWith('name', 'Asha');
    expect(screen.queryByLabelText('edit-name')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Name' })).toHaveFocus());
  });

  it('Escape inside the editor cancels it', async () => {
    const props = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Rating' }));
    await userEvent.keyboard('{Escape}');
    expect(props.restoreField).toHaveBeenCalledWith('rate', 4);
    const section = screen.getByRole('region', { name: 'Page 2' });
    expect(within(section).getByRole('button', { name: 'Edit Rating' })).toBeInTheDocument();
  });
});
