/**
 * __tests__/components/responses/ResponsesTable.test.tsx
 * Feature: sprint-4-responses
 * Tests: ResponsesTable — skeleton loading, empty state, row rendering, master checkbox states
 * Requirements: 2.1-2.8, 7.1, 7.6
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
    answers: { Name: 'Test' },
    status: 'new',
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
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
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

  it('renders the "no match" empty state when a search is active and returns nothing', () => {
    // Feature: sprint-4-responses, Requirement 3.5
    const onClearSearch = vi.fn();
    render(
      <ResponsesTable
        {...baseProps}
        responses={[]}
        isLoading={false}
        selectedIds={new Set()}
        hasActiveSearch
        onClearSearch={onClearSearch}
      />
    );
    expect(screen.getByText('No responses match your search.')).toBeInTheDocument();
    expect(screen.queryByText('No responses yet')).not.toBeInTheDocument();
    screen.getByText('Clear search').click();
    expect(onClearSearch).toHaveBeenCalledOnce();
  });

  it('renders one row per response', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 data rows
  });

  it('master checkbox is unchecked when nothing selected', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(<ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set()} />);
    expect(screen.getByLabelText('Select all responses on this page')).not.toBeChecked();
  });

  it('master checkbox is checked when all rows are selected', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(
      <ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set(['r1', 'r2'])} />
    );
    expect(screen.getByLabelText('Select all responses on this page')).toBeChecked();
  });

  it('master checkbox is indeterminate when some rows are selected', () => {
    const responses = [makeResponse('r1'), makeResponse('r2')];
    render(
      <ResponsesTable {...baseProps} responses={responses} isLoading={false} selectedIds={new Set(['r1'])} />
    );
    const checkbox = screen.getByLabelText('Select all responses on this page') as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });
});
