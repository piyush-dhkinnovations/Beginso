/**
 * __tests__/components/responses/ResponseRow.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.2 (2.1) — `ResponseRow.tsx` no longer exports
 * one `<tr>` component (task 1.7's own note: `ui/Table`'s render-function column API doesn't fit
 * that shape); it exports the cell-building helpers `ResponsesTable` composes into columns.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RespondentCell, TagsCell, AssigneeCell, SubmittedCell } from '@/components/responses/ResponseRow';
import type { IResponse, ResponseTag } from '@/types/response';

// Respondent names come from the form's field definitions (not from guessing at answers), so the
// field lookup is stubbed with a name and an email field matching the fixtures' answer keys.
vi.mock('@/hooks/useFormFields', () => {
  const fields = [
    { fieldId: 'Name', type: 'short_text', label: 'Full name', required: false, deleted: false },
    { fieldId: 'Email', type: 'email', label: 'Email', required: false, deleted: false },
  ];
  return { useFormFields: () => fields, useFormFieldsMap: () => ({ 'form-1': fields, f1: fields }) };
});


const response: IResponse = {
  _id: 'resp-1',
  formId: 'form-1',
  reference: '#7',
  answers: { Name: 'Priya Sharma', Email: 'priya@example.com' },
  stage: { id: 's-new', name: 'New', colour: 'info', category: 'new' },
  assignee: null,
  tags: [],
  noteCount: 2,
  attachmentCount: 1,
  unread: true,
  duplicateOfId: null,
  ipHash: 'a1b2c3d4e5f60718',
  submittedAt: '2026-08-03T09:50:00.000Z',
  createdAt: '2026-08-03T09:50:00.000Z',
  updatedAt: '2026-08-03T09:50:00.000Z',
};

describe('RespondentCell', () => {
  it('renders the detected identity, note and attachment counts, never the raw #reference', () => {
    render(<RespondentCell response={response} />);
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.queryByText('#7')).not.toBeInTheDocument();
    expect(screen.getByLabelText('2 notes')).toBeInTheDocument();
    expect(screen.getByLabelText('1 attachment')).toBeInTheDocument();
  });

  it('announces unread textually, not colour-only', () => {
    render(<RespondentCell response={response} />);
    expect(screen.getByText('Unread.', { exact: false })).toBeInTheDocument();
  });

  it('falls back to Anonymous when no identity is detectable', () => {
    render(<RespondentCell response={{ ...response, answers: { Rating: 5 } }} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});

describe('TagsCell', () => {
  const tags: ResponseTag[] = [
    { id: 't1', name: 'Alpha', colour: '#000' },
    { id: 't2', name: 'Beta', colour: '#000' },
    { id: 't3', name: 'Gamma', colour: '#000' },
  ];

  it('renders a dash when there are no tags', () => {
    render(<TagsCell tags={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('collapses more than 2 tags to "+N"', () => {
    render(<TagsCell tags={tags} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

describe('AssigneeCell', () => {
  it('renders "Unassigned" accessibly when there is no assignee', () => {
    render(<AssigneeCell response={response} />);
    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
  });

  it('renders the assignee name when assigned', () => {
    render(<AssigneeCell response={{ ...response, assignee: { id: 'm1', name: 'Priya', avatarUrl: null } }} />);
    expect(screen.getByText('Priya')).toBeInTheDocument();
  });
});

describe('SubmittedCell', () => {
  it('renders the formatted submission date', () => {
    render(<SubmittedCell response={response} />);
    expect(screen.getByText(/03 Aug 2026/)).toBeInTheDocument();
  });
});
