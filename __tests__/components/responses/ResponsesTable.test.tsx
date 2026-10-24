/**
 * __tests__/components/responses/ResponsesTable.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.2 (2.1) — rebuilt on `ui/Table` (task 1.7);
 * fixtures now carry `stage`/`assignee`/`tags`, and the "no matches" prop is `hasActiveFilters`/
 * `onClearFilters`, not the old `hasActiveSearch`/`onClearSearch`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ResponsesTable } from '@/components/responses/ResponsesTable';
import type { IResponse } from '@/types/response';
import { DEFAULT_RESPONSE_SETUP } from '@/types/responseSetup';

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
  useRouter: () => ({ push: vi.fn() }),
}));

function makeResponse(id: string, overrides: Partial<IResponse> = {}): IResponse {
  return {
    _id: id,
    formId: 'form-1',
    reference: `#${id}`,
    answers: { Name: 'Test' },
    stage: { id: 's-new', name: 'New', colour: 'info', category: 'new' },
    assignee: null,
    tags: [],
    noteCount: 0,
    attachmentCount: 0,
    unread: false,
    duplicateOfId: null,
    ipHash: 'a1b2c3d4e5f60718',
    submittedAt: '2026-08-03T09:50:00.000Z',
    createdAt: '2026-08-03T09:50:00.000Z',
    updatedAt: '2026-08-03T09:50:00.000Z',
    ...overrides,
  };
}

const baseProps = {
  onSelectAll: vi.fn(),
  onSelectRow: vi.fn(),
  onViewResponse: vi.fn(),
  onDeleteResponse: vi.fn(),
};

describe('ResponsesTable: the columns chosen in Customize', () => {
  const rows = [makeResponse('r1', { answers: { Name: 'Asha', Film: 'Monsoon Road' } })];
  const heads = () => screen.getAllByRole('columnheader').map((h) => h.textContent?.replace(/\s+/g, ' ').trim());

  it('shows the standard columns when no setup is given', () => {
    render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} formId="form-1" />);
    expect(heads()).toEqual(['Respondent', 'Email', 'Tags', 'Assignee', 'Stage', 'Submitted', '']);
  });

  it('shows the chosen columns in the chosen order, with the actions menu always last', () => {
    const setup = { ...DEFAULT_RESPONSE_SETUP, tableColumns: ['stage', 'respondent', 'notes'] };
    render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} formId="form-1" setup={setup} />);
    expect(heads()).toEqual(['Stage', 'Respondent', 'Notes', '']);
  });

  it('a question can be a column, headed by the question, and a deleted question is simply left out', () => {
    const setup = { ...DEFAULT_RESPONSE_SETUP, tableColumns: ['respondent', 'q:Email', 'q:gone'] };
    render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} formId="form-1" setup={setup} />);
    expect(heads()).toEqual(['Respondent', 'Email', '']);
  });

  it('with more than the standard columns the table scrolls sideways inside its frame; compact rows are tighter', () => {
    const setup = { ...DEFAULT_RESPONSE_SETUP, tableColumns: ['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'score', 'notes'], rowHeight: 'compact' as const };
    const { container } = render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} formId="form-1" setup={setup} />);
    const table = container.querySelector('table')!;
    expect(table.className).toContain('w-max');
    expect(table.className).toContain('min-w-full');
    expect(table.className).toContain('[&_td]:!py-1');
    expect(table.className).toContain('bg-table-sticky');
  });

  it('the all-forms view always shows the standard columns, whatever a form chose', () => {
    const setup = { ...DEFAULT_RESPONSE_SETUP, tableColumns: ['stage'] };
    render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} formNames={{ 'form-1': 'Survey' }} setup={setup} />);
    expect(heads()).toEqual(['Respondent', 'Form', 'Email', 'Tags', 'Assignee', 'Stage', 'Submitted', '']);
  });
});

describe('ResponsesTable', () => {
  it('renders skeleton rows when isLoading', () => {
    const { container } = render(
      <ResponsesTable {...baseProps} responses={[]} isLoading selectedIds={new Set()} />
    );
    expect(container.querySelectorAll('.bg-skeleton').length).toBeGreaterThan(0);
  });

  it('renders EmptyState when responses is empty and not loading', () => {
    render(<ResponsesTable {...baseProps} responses={[]} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
  });

  it('shows a "Share Form" empty-state CTA when formId is given', () => {
    render(<ResponsesTable {...baseProps} responses={[]} isLoading={false} selectedIds={new Set()} formId="form-1" />);
    expect(screen.getByRole('button', { name: 'Share Form' })).toBeInTheDocument();
  });

  it('falls back to a "Go to Forms" empty-state CTA on the all-forms view (no formId)', () => {
    render(<ResponsesTable {...baseProps} responses={[]} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getByRole('button', { name: 'Go to Forms' })).toBeInTheDocument();
  });

  it('renders the "no matches" empty state when filters are active and return nothing', () => {
    const onClearFilters = vi.fn();
    render(
      <ResponsesTable
        {...baseProps}
        responses={[]}
        isLoading={false}
        selectedIds={new Set()}
        hasActiveFilters
        onClearFilters={onClearFilters}
      />
    );
    expect(screen.getByText('No responses match these filters')).toBeInTheDocument();
    expect(screen.queryByText('No responses yet')).not.toBeInTheDocument();
    screen.getByText('Clear filter').click();
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('renders one row per response, with its stage badge', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 data rows
    expect(screen.getAllByText('New')).toHaveLength(2);
  });

  it('renders "Unknown stage" for a response whose stage was deleted, never throws', () => {
    const responses = [makeResponse('r1', { stage: { id: '', name: '', colour: 'neutral', category: 'new' } })];
    render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getByText('Unknown stage')).toBeInTheDocument();
  });

  it('hides the select column until a row is selected, then shows select-all', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    const { rerender } = render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.queryByLabelText('Select all responses on this page')).not.toBeInTheDocument();
    rerender(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set(['r1'])} />);
    expect(screen.getByLabelText('Select all responses on this page')).toBeInTheDocument();
  });

  it('names the active filters and the number of other responses in the no-matches state', () => {
    render(
      <ResponsesTable {...baseProps} responses={[]} isLoading={false} selectedIds={new Set()} hasActiveFilters onClearFilters={vi.fn()} filterSummary="stage Completed" otherCount={61} />
    );
    expect(screen.getByText('No responses match stage Completed')).toBeInTheDocument();
    expect(screen.getByText('There are 61 other responses.')).toBeInTheDocument();
  });

  it('master checkbox is checked when all rows are selected', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(
      <ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set(['r1', 'r2'])} />
    );
    expect(screen.getByLabelText('Select all responses on this page')).toBeChecked();
  });

  describe('sorting (QA D8-006: it used to reorder only the loaded page)', () => {
    const rows = [
      makeResponse('a', { answers: { Name: 'Zed' }, stage: { id: 's2', name: 'Done', colour: 'success', category: 'completed' }, submittedAt: '2026-08-01T10:00:00.000Z' }),
      makeResponse('b', { answers: { Name: 'Amy' }, submittedAt: '2026-08-02T10:00:00.000Z' }),
    ];
    const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });
    const order = () => screen.getAllByRole('row').slice(1).map((r) => within(r).getByRole('button', { name: /Open response from/ }).getAttribute('aria-label'));

    it('Submitted shows the server order, and clicking it asks the server for the other direction', () => {
      const onSubmittedOrderChange = vi.fn();
      const { rerender } = render(
        <ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} totalMatching={120} submittedOrder="desc" onSubmittedOrderChange={onSubmittedOrderChange} />
      );
      expect(header('Submitted')).toHaveAttribute('aria-sort', 'descending');
      fireEvent.click(within(header('Submitted')).getByRole('button'));
      expect(onSubmittedOrderChange).toHaveBeenCalledWith('asc');

      rerender(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} totalMatching={120} submittedOrder="asc" onSubmittedOrderChange={onSubmittedOrderChange} />);
      expect(header('Submitted')).toHaveAttribute('aria-sort', 'ascending');
      fireEvent.click(within(header('Submitted')).getByRole('button'));
      expect(onSubmittedOrderChange).toHaveBeenLastCalledWith('desc');
    });

    it('does not reorder the rows itself for Submitted: they stay in the order the server sent', () => {
      render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} totalMatching={120} submittedOrder="asc" onSubmittedOrderChange={vi.fn()} />);
      expect(order()).toEqual(['Open response from Zed', 'Open response from Amy']);
    });

    it('Respondent and Stage cannot be sorted while more responses match than are on screen', () => {
      render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} totalMatching={120} submittedOrder="desc" onSubmittedOrderChange={vi.fn()} />);
      expect(within(header('Respondent')).queryByRole('button')).toBeNull();
      expect(within(header('Stage')).queryByRole('button')).toBeNull();
      expect(within(header('Submitted')).getByRole('button')).toBeInTheDocument();
    });

    it('when every match is on screen, Respondent sorts the rows by name', () => {
      render(<ResponsesTable {...baseProps} responses={rows} isLoading={false} selectedIds={new Set()} totalMatching={2} submittedOrder="desc" onSubmittedOrderChange={vi.fn()} />);
      fireEvent.click(within(header('Respondent')).getByRole('button'));
      expect(header('Respondent')).toHaveAttribute('aria-sort', 'ascending');
      expect(order()).toEqual(['Open response from Amy', 'Open response from Zed']);
      // Submitted is no longer the active sort while a column sort is.
      expect(header('Submitted')).toHaveAttribute('aria-sort', 'none');
    });
  });
});
