import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseColumnCell, columnLabel } from '@/components/responses/ResponseColumnCell';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

vi.mock('@/hooks/useFormFields', () => ({ useFormFields: () => FIELDS }));

const field = (fieldId: string, label: string, type: FormField['type'] = 'short_text') =>
  ({ fieldId, label, type, pageId: 'p', required: false, deleted: false, order: 0 }) as FormField;
const FIELDS = [field('n', 'Full name'), field('film', 'Title of the film'), field('sig', 'Signature', 'signature')];

const RESPONSE = {
  _id: 'r1',
  formId: 'f1',
  answers: { 'Full name': 'Asha Rao', 'Title of the film': 'Monsoon Road' },
  respondentEmail: 'asha@example.com',
  stage: { id: 's1', name: 'Screening', colour: 'warning', category: 'in_progress' },
  assignee: null,
  tags: [],
  noteCount: 3,
  scoreAverage: 4.25,
  submittedAt: '2026-10-16T10:00:00.000Z',
  createdAt: '2026-10-16T10:00:00.000Z',
  updatedAt: '2026-10-16T10:00:00.000Z',
} as unknown as IResponse;

const cell = (columnKey: string, extra: Partial<React.ComponentProps<typeof ResponseColumnCell>> = {}, response = RESPONSE) =>
  render(<ResponseColumnCell columnKey={columnKey} response={response} fields={FIELDS} {...extra} />);

describe('columnLabel', () => {
  it('names a built-in column, and a question column by the question', () => {
    expect(columnLabel('stage', FIELDS)).toBe('Stage');
    expect(columnLabel('score', FIELDS)).toBe('Average score');
    expect(columnLabel('q:film', FIELDS)).toBe('Title of the film');
  });

  it('has no name for a question that is gone or is not text, so its column is dropped', () => {
    expect(columnLabel('q:deleted', FIELDS)).toBeUndefined();
    expect(columnLabel('q:sig', FIELDS)).toBeUndefined();
  });
});

describe('ResponseColumnCell', () => {
  it('shows the answer to a question', () => {
    cell('q:film');
    expect(screen.getByText('Monsoon Road')).toBeInTheDocument();
  });

  it('shows a dash for a question the response left blank', () => {
    cell('q:film', {}, { ...RESPONSE, answers: {} } as IResponse);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('cuts a long answer short with the full text on hover, unless the table wraps', () => {
    const long = 'x'.repeat(300);
    const withLong = { ...RESPONSE, answers: { 'Title of the film': long } } as IResponse;
    const { container, unmount } = cell('q:film', {}, withLong);
    expect(container.querySelector('.truncate')).not.toBeNull();
    expect(container.querySelector('[title]')).toHaveAttribute('title', long);
    unmount();
    const wrapped = cell('q:film', { wrap: true }, withLong);
    expect(wrapped.container.querySelector('.truncate')).toBeNull();
    expect(wrapped.container.querySelector('.whitespace-normal')).not.toBeNull();
  });

  it('shows the respondent name from the question chosen for it', () => {
    cell('respondent', { respondentFrom: 'film' });
    expect(screen.getByText('Monsoon Road')).toBeInTheDocument();
  });

  it('shows the stage, the score and the note count', () => {
    cell('stage');
    expect(screen.getByText('Screening')).toBeInTheDocument();
    cell('score');
    expect(screen.getByText('4.3')).toBeInTheDocument();
    cell('notes');
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a dash for a response nobody scored or noted', () => {
    cell('score', {}, { ...RESPONSE, scoreAverage: null } as IResponse);
    cell('notes', {}, { ...RESPONSE, noteCount: 0 } as IResponse);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });
});
