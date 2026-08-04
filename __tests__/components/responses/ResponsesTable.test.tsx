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
  useParams: () => ({ id: 'form-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

function makeResponse(id: string, overrides: Partial<IResponse> = {}): IResponse {
  return {
    _id: id,
    formId: 'form-1',
    workspaceId: 'ws-1',
    answers: [{ fieldId: 'f1', fieldType: 'short_text', fieldLabel: 'Name', value: 'Test' }],
    status: 'new',
    metadata: { ipHash: 'a1b2c3d4e5f60718', userAgent: 'Mozilla/5.0' },
    submittedAt: '2026-08-03T09:50:00.000Z',
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
