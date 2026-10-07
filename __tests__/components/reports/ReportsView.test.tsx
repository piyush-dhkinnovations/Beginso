/**
 * __tests__/components/reports/ReportsView.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: ReportsView — staged filters don't fetch, form pre-select from ?formId=, Generate
 * triggers the mutation with the staged payload, optimistic list insert, error toast,
 * both cards disabled while either is submitting
 * Requirements: 9, 10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let search = '';
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => new URLSearchParams(search),
}));

const mockGetForms = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getForms: (...args: unknown[]) => mockGetForms(...args) },
}));

const mockCreateReport = vi.fn();
const mockGetReports = vi.fn();
vi.mock('@/services/reports', () => ({
  reportsService: {
    createReport: (...args: unknown[]) => mockCreateReport(...args),
    getReports: (...args: unknown[]) => mockGetReports(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ReportsView } from '@/components/reports/ReportsView';
import { reportKeys } from '@/lib/queryKeys';

const forms = [
  { _id: 'form-1', title: 'Customer Survey' },
  { _id: 'form-2', title: 'Event Registration' },
];

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ReportsView />
    </QueryClientProvider>
  );
  return { queryClient, ...utils };
}

describe('ReportsView', () => {
  beforeEach(() => {
    search = '';
    mockReplace.mockReset();
    mockPush.mockReset();
    mockGetForms.mockReset().mockResolvedValue({ forms, total: 2, page: 1, limit: 100 });
    mockCreateReport.mockReset();
    mockGetReports.mockReset().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockToast.mockReset();
  });

  it('does not call createReport when filters change — only Generate triggers a request', async () => {
    renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Form'), { target: { value: 'form-1' } });

    expect(mockCreateReport).not.toHaveBeenCalled();
  });

  it('pre-selects the form from ?formId=', async () => {
    search = 'formId=form-2';
    renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());

    await waitFor(() => expect(screen.getByLabelText('Form')).toHaveValue('form-2'));
  });

  it('Generate triggers the mutation with the staged filters and the clicked card\'s format', async () => {
    mockCreateReport.mockResolvedValue({ _id: 'report-1', format: 'csv', status: 'queued', createdAt: '2026-08-14T00:00:00.000Z' });
    renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Form'), { target: { value: 'form-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[0]);

    await waitFor(() =>
      expect(mockCreateReport).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'csv', formId: 'form-1' }),
        'personal'
      )
    );
  });

  it('optimistically prepends the new job into the cache and toasts success', async () => {
    const job = { _id: 'report-new', format: 'csv' as const, status: 'queued' as const, createdAt: '2026-08-14T00:00:00.000Z' };
    mockCreateReport.mockResolvedValue(job);
    const existing = {
      data: [{ _id: 'report-old', format: 'pdf' as const, status: 'completed' as const, createdAt: '2026-08-13T00:00:00.000Z' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockGetReports.mockResolvedValue(existing);
    const { queryClient } = renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());
    await waitFor(() => expect(mockGetReports).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[0]);

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Report generation started.', 'success'));
    await waitFor(() =>
      expect(queryClient.getQueryData(reportKeys.list(1))).toEqual({ ...existing, data: [job, existing.data[0]] })
    );
  });

  it('enriches the optimistic job with the submitted formId/dates when the POST response omits them (S5-04)', async () => {
    // Real backend gap: the create response has been observed not to echo back every scope
    // field — the optimistic row must still show the correct form immediately, from what was
    // actually submitted, not wait for the next poll to self-correct.
    mockCreateReport.mockResolvedValue({ _id: 'report-new', format: 'csv', status: 'queued', createdAt: '2026-08-14T00:00:00.000Z' });
    mockGetReports.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const { queryClient } = renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());
    await waitFor(() => expect(mockGetReports).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Form'), { target: { value: 'form-1' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[0]);

    await waitFor(() => {
      const cached = queryClient.getQueryData(reportKeys.list(1)) as { data: { formId?: string }[] };
      expect(cached.data[0].formId).toBe('form-1');
    });
  });

  it('shows an error toast when the mutation fails', async () => {
    mockCreateReport.mockRejectedValue(new Error('fail'));
    renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole('button', { name: /^Generate/ })[1]);

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to start report generation. Please try again.', 'error'));
  });

  it('disables both cards while either format is submitting (Requirement 10.5)', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateReport.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    renderView();
    await waitFor(() => expect(mockGetForms).toHaveBeenCalled());

    const buttons = screen.getAllByRole('button', { name: /^Generate/ });
    fireEvent.click(buttons[0]);

    await waitFor(() => expect(buttons[1]).toBeDisabled());

    resolveCreate({ _id: 'r1', format: 'csv', status: 'queued', createdAt: '2026-08-14T00:00:00.000Z' });
  });
});
