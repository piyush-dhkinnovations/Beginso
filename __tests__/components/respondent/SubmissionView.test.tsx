import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmissionView } from '@/components/respondent/SubmissionView';
import type { RespondLinkField } from '@/types/respondent';

const fields: RespondLinkField[] = [
  { fieldId: 'name', label: 'Full name', type: 'short_text', value: 'Asha', required: true },
  { fieldId: 'bio', label: 'About you', type: 'long_text', value: 'Hello' },
  { fieldId: 'color', label: 'Colour', type: 'dropdown', value: 'Red', options: ['Red', 'Blue'] },
  { fieldId: 'tags', label: 'Tags', type: 'checkbox', value: ['a', 'b'] },
  { fieldId: 'cv', label: 'Resume', type: 'file_upload', value: 'cv.pdf' },
  { fieldId: 'sig', label: 'Signature', type: 'signature', value: 'Asha' },
  { fieldId: 'empty', label: 'Empty one', type: 'short_text', value: '' },
];

const onSave = () => vi.fn().mockResolvedValue({});

describe('SubmissionView (read mode)', () => {
  it('lists every answer, joining arrays and showing a dash for empty values', () => {
    render(<SubmissionView fields={fields} canEdit={false} onSave={onSave()} />);
    expect(screen.getByText('Full name').nextSibling).toHaveTextContent('Asha');
    expect(screen.getByText('Tags').nextSibling).toHaveTextContent('a, b');
    expect(screen.getByText('Empty one').nextSibling).toHaveTextContent('—');
  });

  it('shows the status badge only when given', () => {
    const { rerender } = render(<SubmissionView fields={fields} canEdit={false} onSave={onSave()} />);
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
    rerender(<SubmissionView fields={fields} status="In review" canEdit={false} onSave={onSave()} />);
    expect(screen.getByText(/Status:/)).toHaveTextContent("In review");
  });

  it('hides the Edit button when the submission is not editable', () => {
    render(<SubmissionView fields={fields} canEdit={false} onSave={onSave()} />);
    expect(screen.queryByRole('button', { name: 'Edit my answers' })).not.toBeInTheDocument();
  });

  it.each([
    ['closed', /form is closed/],
    ['archived', /archived/],
    ['trashed', /no longer available/],
    ['finalised', /completed and can no longer/],
    ['something_else', /can no longer be changed/],
  ])('explains a %s read-only submission', (reason, text) => {
    render(<SubmissionView fields={fields} canEdit={false} readOnlyReason={reason} onSave={onSave()} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('does not show a read-only reason when the submission is editable', () => {
    render(<SubmissionView fields={fields} canEdit readOnlyReason="closed" onSave={onSave()} />);
    expect(screen.queryByText(/is closed/)).not.toBeInTheDocument();
  });
});

describe('SubmissionView (edit mode)', () => {
  async function startEditing(save = onSave()) {
    render(<SubmissionView fields={fields} canEdit onSave={save} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit my answers' }));
    return save;
  }

  it('turns text, long text and choice answers into prefilled controls', async () => {
    await startEditing();
    expect(screen.getByLabelText('Full name')).toHaveValue('Asha');
    expect(screen.getByLabelText('About you').tagName).toBe('TEXTAREA');
    expect(screen.getByLabelText('Colour')).toHaveValue('Red');
    expect(screen.getByLabelText('Tags')).toHaveValue('a, b');
  });

  it('keeps file and signature answers read-only with an explanation', async () => {
    await startEditing();
    expect(screen.getAllByText(/this answer cannot be changed here/)).toHaveLength(2);
    expect(screen.queryByLabelText('Resume')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Signature')).not.toBeInTheDocument();
  });

  it('sends a multi-value answer back as a list, whether edited or not', async () => {
    const save = await startEditing();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].tags).toEqual(['a', 'b']);
  });

  it('turns an edited multi-value answer ("a, c , ") into a clean list', async () => {
    const save = await startEditing();
    const tags = screen.getByLabelText('Tags');
    await userEvent.clear(tags);
    await userEvent.type(tags, 'a, c , ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].tags).toEqual(['a', 'c']);
    expect(save.mock.calls[0][0].name).toBe('Asha');
  });

  it('refuses to save a blank required answer and does not call onSave', async () => {
    const save = await startEditing();
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('"Full name" is required.');
    expect(save).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only required answer as blank', async () => {
    const save = await startEditing();
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.type(screen.getByLabelText('Full name'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the edited draft (without read-only fields) and returns to read mode with a notice', async () => {
    const save = await startEditing();
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.type(screen.getByLabelText('Full name'), 'Asha R');
    await userEvent.selectOptions(screen.getByLabelText('Colour'), 'Blue');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.getByText('Your changes were saved.')).toBeInTheDocument());
    const sent = save.mock.calls[0][0];
    expect(sent).toMatchObject({ name: 'Asha R', color: 'Blue', bio: 'Hello', tags: ['a', 'b'] });
    expect(sent).not.toHaveProperty('cv');
    expect(sent).not.toHaveProperty('sig');
    expect(screen.getByRole('button', { name: 'Edit my answers' })).toBeInTheDocument();
  });

  it('says the reviewer was told when the server reports an edit after review', async () => {
    const save = vi.fn().mockResolvedValue({ editedAfterReview: true });
    await startEditing(save);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.getByText('Edited — your reviewer has been told.')).toBeInTheDocument());
  });

  it('shows the server error message and stays in edit mode when saving fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Form is closed'));
    await startEditing(save);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Form is closed');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    const save = vi.fn().mockRejectedValue('boom');
    await startEditing(save);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save your changes.');
  });

  it('Cancel discards the draft and shows the original answers', async () => {
    const save = await startEditing();
    await userEvent.type(screen.getByLabelText('Full name'), 'ZZZ');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Full name').nextSibling).toHaveTextContent('Asha');
    expect(save).not.toHaveBeenCalled();
  });

  it('uses typed inputs for email, number and date fields', async () => {
    render(
      <SubmissionView
        canEdit
        onSave={onSave()}
        fields={[
          { fieldId: 'e', label: 'Mail', type: 'email', value: 'a@b.co' },
          { fieldId: 'n', label: 'Count', type: 'number', value: 3 },
          { fieldId: 'd', label: 'When', type: 'date', value: '2026-01-02' },
        ]}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit my answers' }));
    expect(screen.getByLabelText('Mail')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Count')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('When')).toHaveAttribute('type', 'date');
  });
});

describe('SubmissionView — status banner and answers sheet', () => {
  it('explains the status in a plain line beside the badge, and numbers the answers', () => {
    render(<SubmissionView fields={[{ fieldId: 'a', label: 'Full name', type: 'short_text', value: 'Asha' }]} status="Edited" canEdit={false} onSave={vi.fn()} />);
    expect(screen.getByText('You changed it after it was reviewed.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your answers' })).toHaveTextContent('1');
  });
});
