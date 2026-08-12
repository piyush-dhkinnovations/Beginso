/**
 * __tests__/components/analytics/FormsSummaryTable.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: FormsSummaryTable — renders rows, Change column (vs previousForms), Completion Rate
 * column, pagination, row click navigates, empty state
 * Requirements: 7.1-7.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

import { FormsSummaryTable } from '@/components/analytics/FormsSummaryTable';
import { mockFormsSummary } from '@/lib/mocks/analyticsMocks';

describe('FormsSummaryTable', () => {
  it('shows skeleton rows while loading', () => {
    const { container } = render(<FormsSummaryTable isLoading page={1} onPageChange={vi.fn()} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it('renders an inline error card with retry', () => {
    const onRetry = vi.fn();
    render(<FormsSummaryTable isLoading={false} isError onRetry={onRetry} page={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders "No forms yet" with a Create Form CTA when the workspace has zero forms', () => {
    render(<FormsSummaryTable data={{ forms: [], total: 0, page: 1, limit: 20 }} isLoading={false} page={1} onPageChange={vi.fn()} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Form/ })).toHaveAttribute('href', '/forms');
  });

  it('renders each form\'s title, status, total responses, and completion rate', () => {
    const data = mockFormsSummary();
    render(<FormsSummaryTable data={data} isLoading={false} page={1} onPageChange={vi.fn()} />);

    data.forms.forEach((form) => {
      expect(screen.getAllByText(form.title).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
  });

  it('shows "—" in the Change column when there is no previous-period data for a form', () => {
    const data = mockFormsSummary({ forms: [{ _id: 'form-9', title: 'Solo Form', status: 'published', totalResponses: 10, completionRate: 50 }] });
    render(<FormsSummaryTable data={data} isLoading={false} page={1} onPageChange={vi.fn()} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('computes an up/down Change label from previousForms, matched by form id', () => {
    const data = mockFormsSummary({
      forms: [
        { _id: 'form-up', title: 'Growing Form', status: 'published', totalResponses: 120, completionRate: 50 },
        { _id: 'form-down', title: 'Shrinking Form', status: 'published', totalResponses: 80, completionRate: 50 },
      ],
    });
    const previousForms = [
      { _id: 'form-up', title: 'Growing Form', status: 'published' as const, totalResponses: 100, completionRate: 50 },
      { _id: 'form-down', title: 'Shrinking Form', status: 'published' as const, totalResponses: 100, completionRate: 50 },
    ];
    render(<FormsSummaryTable data={data} previousForms={previousForms} isLoading={false} page={1} onPageChange={vi.fn()} />);

    expect(screen.getByText('↑ 20.0%')).toBeInTheDocument();
    expect(screen.getByText('↓ 20.0%')).toBeInTheDocument();
  });

  it('navigates to the form\'s Auto-Dashboard when a row is clicked', () => {
    const data = mockFormsSummary({ forms: [{ _id: 'form-9', title: 'Solo Form', status: 'published', totalResponses: 3, completionRate: 50 }] });
    render(<FormsSummaryTable data={data} isLoading={false} page={1} onPageChange={vi.fn()} />);

    fireEvent.click(screen.getAllByText('Solo Form')[0]);

    expect(mockPush).toHaveBeenCalledWith('/forms/form-9/analytics');
  });

  it('renders pagination controls and forwards page changes', () => {
    const data = mockFormsSummary({ total: 100, page: 1, limit: 20 });
    const onPageChange = vi.fn();
    render(<FormsSummaryTable data={data} isLoading={false} page={1} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
