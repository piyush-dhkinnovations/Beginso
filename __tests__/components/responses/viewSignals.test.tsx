import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';

// Respondent names come from the form's field definitions (not from guessing at answers), so the
// field lookup is stubbed with a name and an email field matching the fixtures' answer keys.
vi.mock('@/hooks/useFormFields', () => {
  const fields = [
    { fieldId: 'Name', type: 'short_text', label: 'Full name', required: false, deleted: false },
    { fieldId: 'Email', type: 'email', label: 'Email', required: false, deleted: false },
  ];
  return { useFormFields: () => fields, useFormFieldsMap: () => ({ 'form-1': fields, f1: fields }) };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { ResponsesTable } from '@/components/responses/ResponsesTable';
import { BoardCard } from '@/components/responses/BoardCard';
import { CalendarItemRow } from '@/components/responses/ResponsesCalendar';
import type { IResponse } from '@/types/response';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.4 (4.1), design.md §6/§21 (task 3.5).
 * "Same signals in every view" — one fixture rendered through Table, Board and Calendar
 * (compact density, `CalendarItemRow`, the exact component the agenda list and day-overflow modal
 * both render) must carry every signal in every view. This test is meant to fail the moment a
 * future change drops one from any of them.
 */
const FIXTURE: IResponse = {
  _id: 'r1',
  formId: 'f1',
  reference: '#142',
  answers: { Name: 'Jordan Lee', Email: 'jordan@example.com' },
  stage: { id: 's1', name: 'Screening', colour: 'info', category: 'in_progress' },
  assignee: { id: 'm1', name: 'Priya Shah', avatarUrl: null },
  tags: [{ id: 't1', name: 'VIP', colour: 'primary' }],
  noteCount: 2,
  attachmentCount: 1,
  unread: true,
  duplicateOfId: null,
  submittedAt: '2026-09-15T10:00:00.000Z',
  createdAt: '2026-09-15T10:00:00.000Z',
  updatedAt: '2026-09-15T10:00:00.000Z',
};

function expectAllSignals(container: HTMLElement) {
  // Respondent identity — may appear more than once (e.g. Table's name plus its answer preview).
  expect(within(container).getAllByText(/Jordan Lee|jordan@example\.com/).length).toBeGreaterThan(0);
  // Assignee — visible text at row/card density, an accessible name at compact (ResponseSignals
  // hides the visible name there and shows only the avatar's initials).
  const assignee = within(container).queryByText('Priya Shah') ?? within(container).queryByLabelText(/Priya Shah/);
  expect(assignee).toBeTruthy();
  // Tag
  expect(within(container).getByText('VIP')).toBeInTheDocument();
  // Note / attachment counts
  expect(within(container).getByLabelText(/2 notes?/)).toBeInTheDocument();
  expect(within(container).getByLabelText(/1 attachments?/)).toBeInTheDocument();
  // Unread — rendered textually somewhere, never colour-only (requirements.md §11).
  expect(within(container).getAllByText(/^Unread\.?$/).length).toBeGreaterThan(0);
}

describe('same signals in every view', () => {
  it('Table', () => {
    const { container } = render(
      <ResponsesTable
        responses={[FIXTURE]}
        isLoading={false}
        selectedIds={new Set()}
        onSelectAll={vi.fn()}
        onSelectRow={vi.fn()}
        onViewResponse={vi.fn()}
        onDeleteResponse={vi.fn()}
      />
    );
    expectAllSignals(container);
  });

  it('Board', () => {
    const { container } = render(
      <BoardCard response={FIXTURE} stages={[FIXTURE.stage!]} canAct={false} onView={vi.fn()} onChangeStage={vi.fn()} />
    );
    expectAllSignals(container);
  });

  it('Calendar (compact density)', () => {
    const { container } = render(<CalendarItemRow response={FIXTURE} onSelect={vi.fn()} />);
    expectAllSignals(container);
  });
});
