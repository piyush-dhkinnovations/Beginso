/**
 * __tests__/components/reports/ReportJobsList.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: ReportJobsList — renders rows, empty state, error state, polling toggles based on job
 * statuses, status-transition toast, Retry re-submits, pagination
 * Requirements: 11.1-11.7, 13.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetReports = vi.fn();
const mockCreateReport = vi.fn();
vi.mock('@/services/reports', () => ({
  reportsService: {
    getReports: (...args: unknown[]) => mockGetReports(...args),
    createReport: (...args: unknown[]) => mockCreateReport(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ReportJobsList } from '@/components/reports/ReportJobsList';
import { mockReportJob } from '@/lib/mocks/reportsMocks';

function renderList(page = 1, onPageChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { queryClient, ...render(
    <QueryClientProvider client={queryClient}>
      <ReportJobsList page={page} onPageChange={onPageChange} />
    </QueryClientProvider>
  ) };
}

describe('ReportJobsList', () => {
  beforeEach(() => {
    mockGetReports.mockReset();
    mockCreateReport.mockReset();
    mockToast.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows skeleton rows while loading', () => {
    mockGetReports.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderList();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
  });

  it('renders an inline error card with retry', async () => {
    mockGetReports.mockRejectedValue(new Error('fail'));
    renderList();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load report jobs')).toBeInTheDocument();
  });

  it('renders "No reports yet" when there are zero jobs', async () => {
    mockGetReports.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    renderList();

    expect(await screen.findByText('No reports yet')).toBeInTheDocument();
  });

  it('renders one row per job, newest first as returned by the backend', async () => {
    const job1 = mockReportJob({ _id: 'r1', status: 'completed', formTitle: 'Form A' });
    const job2 = mockReportJob({ _id: 'r2', status: 'queued', formTitle: 'Form B' });
    mockGetReports.mockResolvedValue({ data: [job1, job2], total: 2, page: 1, limit: 20, totalPages: 1 });
    renderList();

    expect(await screen.findAllByText(/Form A/)).not.toHaveLength(0);
    expect(screen.getAllByText(/Form B/)).not.toHaveLength(0);
  });

  it('de-duplicates jobs by _id rather than rendering a repeated row (and key) for it', async () => {
    const job = mockReportJob({ _id: 'r1', status: 'completed', formTitle: 'Duplicated Form' });
    mockGetReports.mockResolvedValue({ data: [job, { ...job }], total: 2, page: 1, limit: 20, totalPages: 1 });
    renderList();

    // The list renders both a desktop table row and a mobile card for every job (responsive
    // layout, both present in jsdom regardless of viewport), so a correctly-deduped single job
    // legitimately produces 2 matches — one per variant. A dedupe failure would instead double
    // that to 4 (2 jobs × 2 variants), which is what this assertion actually guards against.
    expect(await screen.findAllByText(/Duplicated Form/)).toHaveLength(2);
  });

  it('polls every 5s while any loaded job is queued/processing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetReports.mockResolvedValue({
      data: [mockReportJob({ _id: 'r1', status: 'processing' })],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    renderList();

    await vi.waitFor(() => expect(mockGetReports).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(() => expect(mockGetReports).toHaveBeenCalledTimes(2));
  });

  it('backfills formId/responseStatus/from/to from the previous poll when a later poll omits them for the same job (S5-04)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const withScope = mockReportJob({ _id: 'r1', status: 'processing', formId: 'form-9', formTitle: undefined, responseStatus: 'completed', from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T00:00:00.000Z' });
    const scopeDropped = { ...withScope, status: 'completed' as const, formId: undefined, responseStatus: undefined, from: undefined, to: undefined };
    mockGetReports
      .mockResolvedValueOnce({ data: [withScope], total: 1, page: 1, limit: 20, totalPages: 1 })
      .mockResolvedValueOnce({ data: [scopeDropped], total: 1, page: 1, limit: 20, totalPages: 1 });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ReportJobsList page={1} onPageChange={vi.fn()} formTitleById={new Map([['form-9', 'Job Application']])} />
      </QueryClientProvider>
    );

    expect(await screen.findAllByText(/Job Application/)).not.toHaveLength(0);

    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(() => expect(mockGetReports).toHaveBeenCalledTimes(2));

    // Second poll's raw response has no formId at all — the row must still show the form name
    // (backfilled), not regress to "All Forms".
    expect(screen.getAllByText(/Job Application/)).not.toHaveLength(0);
    expect(screen.queryByText(/All Forms/)).not.toBeInTheDocument();
  });

  it('stops polling once every loaded job is terminal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetReports.mockResolvedValue({
      data: [mockReportJob({ _id: 'r1', status: 'completed' })],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    renderList();

    await vi.waitFor(() => expect(mockGetReports).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(20_000);
    expect(mockGetReports).toHaveBeenCalledTimes(1);
  });

  it('toasts only on a status transition to completed, not on the initial load or repeat polls of the same status', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const job = mockReportJob({ _id: 'r1', status: 'processing' });
    mockGetReports.mockResolvedValueOnce({ data: [job], total: 1, page: 1, limit: 20, totalPages: 1 });
    renderList();

    await vi.waitFor(() => expect(mockGetReports).toHaveBeenCalledTimes(1));
    expect(mockToast).not.toHaveBeenCalled();

    mockGetReports.mockResolvedValue({ data: [{ ...job, status: 'completed' }], total: 1, page: 1, limit: 20, totalPages: 1 });
    await vi.advanceTimersByTimeAsync(5_000);

    await vi.waitFor(() => expect(mockToast).toHaveBeenCalledWith('Your report is ready to download.', 'success'));
  });

  it('Retry reconstructs the original filters from the job and optimistically inserts the new job', async () => {
    const failedJob = mockReportJob({
      _id: 'r1',
      status: 'failed',
      format: 'csv',
      formId: 'form-9',
      responseStatus: 'completed',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
      errorMessage: 'Report generation timed out. Please try again.',
    });
    mockGetReports.mockResolvedValue({ data: [failedJob], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockCreateReport.mockResolvedValue(mockReportJob({ _id: 'r-new', status: 'queued' }));
    renderList();

    // Both the desktop row and mobile card render their own Retry button for the same job —
    // either triggers the identical `handleRetry`, so clicking the first is sufficient.
    fireEvent.click((await screen.findAllByRole('button', { name: /Retry/ }))[0]);

    await waitFor(() =>
      expect(mockCreateReport).toHaveBeenCalledWith(
        {
          format: 'csv',
          formId: 'form-9',
          from: '2026-07-01T00:00:00.000Z',
          to: '2026-07-31T00:00:00.000Z',
        },
        'personal'
      )
    );
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Report generation started.', 'success'));
  });

  it('forwards page changes to onPageChange via PaginationControls', async () => {
    const jobs = Array.from({ length: 1 }, (_, i) => mockReportJob({ _id: `r${i}` }));
    mockGetReports.mockResolvedValue({ data: jobs, total: 100, page: 1, limit: 20, totalPages: 5 });
    const onPageChange = vi.fn();
    renderList(1, onPageChange);

    fireEvent.click(await screen.findByRole('button', { name: /Next/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
