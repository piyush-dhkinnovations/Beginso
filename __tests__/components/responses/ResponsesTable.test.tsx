/**
 * __tests__/components/responses/ResponsesTable.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.2 (2.1) — rebuilt on `ui/Table` (task 1.7);
 * fixtures now carry `stage`/`assignee`/`tags`, and the "no matches" prop is `hasActiveFilters`/
 * `onClearFilters`, not the old `hasActiveSearch`/`onClearSearch`.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsesTable } from '@/components/responses/ResponsesTable';
import type { IResponse } from '@/types/response';

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
    screen.getByText('Clear filters').click();
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

  it('select-all checkbox is not rendered until something is selected (double-click reveals it)', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.queryByLabelText('Select all responses on this page')).not.toBeInTheDocument();
  });

  it('master checkbox is checked when all rows are selected', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(
      <ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set(['r1', 'r2'])} />
    );
    expect(screen.getByLabelText('Select all responses on this page')).toBeChecked();
  });
});
