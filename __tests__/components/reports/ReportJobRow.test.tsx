/**
 * __tests__/components/reports/ReportJobRow.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: ReportJobRow — status Badge mapping, Download/Retry/disabled-expired variants,
 * scope label, relative timestamp
 * Requirements: 11.1, 11.4-11.6, 12.1-12.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { mockReportJob } from '@/lib/mocks/reportsMocks';

const mockGetReportFileBlobUrl = vi.fn();
vi.mock('@/services/reports', () => ({
  reportsService: { getReportFileBlobUrl: (...args: unknown[]) => mockGetReportFileBlobUrl(...args) },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { ReportJobRow } from '@/components/reports/ReportJobRow';

describe('ReportJobRow', () => {
  beforeEach(() => {
    mockGetReportFileBlobUrl.mockReset().mockResolvedValue('blob:mock-url');
    mockToast.mockReset();
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('renders the form title, response-status filter, date range, and a relative timestamp', () => {
    // Fake timers scoped to just this test — vitest's real-timer-based `waitFor` (used by other
    // tests in this file) hangs indefinitely under global fake timers with no manual advancement.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T00:00:00.000Z'));

    const job = mockReportJob({
      status: 'queued',
      formTitle: 'Event Registration',
      responseStatus: 'completed',
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T00:00:00.000Z',
      createdAt: '2026-08-13T23:55:00.000Z',
    });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);

    expect(screen.getByText('Event Registration')).toBeInTheDocument();
    expect(screen.getByText(/Completed · Jul 1, 2026 – Jul 31, 2026/)).toBeInTheDocument();
    // The cell now shows the absolute date; the relative time is its tooltip.
    expect(screen.getByTitle('5 minutes ago')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('an export of chosen responses says how many, not "All time"', () => {
    const job = mockReportJob({ status: 'queued', formTitle: 'Customer service', responseStatus: undefined, from: undefined, to: undefined, selectedCount: 1 });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);
    expect(screen.getByText('Customer service')).toBeInTheDocument();
    expect(screen.getByText('1 selected response')).toBeInTheDocument();
    expect(screen.queryByText(/All time/)).not.toBeInTheDocument();
  });

  it('falls back to "All Forms" when there is no scoped form', () => {
    const job = mockReportJob({ status: 'queued', formId: undefined, formTitle: undefined, responseStatus: undefined, from: undefined, to: undefined });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);
    expect(screen.getByText(/All Forms/)).toBeInTheDocument();
  });

  it('resolves the form name from formTitleById when the job has a formId but no formTitle (real backend shape)', () => {
    const job = mockReportJob({ status: 'queued', formId: 'form-9', formTitle: undefined });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} formTitleById={new Map([['form-9', 'Job Application']])} /></tbody></table>);
    expect(screen.getByText(/Job Application/)).toBeInTheDocument();
    expect(screen.queryByText('All Forms')).not.toBeInTheDocument();
  });

  it('falls back to the raw formId (not "All Forms") when it can\'t be resolved to a title', () => {
    const job = mockReportJob({ status: 'queued', formId: 'form-deleted', formTitle: undefined });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} formTitleById={new Map()} /></tbody></table>);
    expect(screen.getByText(/form-deleted/)).toBeInTheDocument();
    expect(screen.queryByText('All Forms')).not.toBeInTheDocument();
  });

  it.each([
    ['queued', 'Queued'],
    ['processing', 'Processing'],
    ['completed', 'Completed'],
    ['failed', 'Failed'],
    ['expired', 'Expired'],
  ] as const)('shows the %s status as a "%s" badge', (status, label) => {
    const job = mockReportJob({ status });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows no action button for a queued or processing job', () => {
    const job = mockReportJob({ status: 'processing' });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('a completed job shows Download and calls getReportFileBlobUrl on click', async () => {
    const job = mockReportJob({ status: 'completed', format: 'csv' });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(mockGetReportFileBlobUrl).toHaveBeenCalledWith(job._id, expect.any(Function)));
  });

  it('a failed job shows the safe error message and a Retry button that calls onRetry', () => {
    const onRetry = vi.fn();
    const job = mockReportJob({ status: 'failed', errorMessage: 'Report generation timed out. Please try again.' });
    render(<table><tbody><ReportJobRow job={job} onRetry={onRetry} /></tbody></table>);

    expect(screen.getByText('Report generation timed out. Please try again.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledWith(job);
  });

  it('an expired job shows a disabled Unavailable action with an explanatory tooltip', () => {
    const job = mockReportJob({ status: 'expired' });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);

    const button = screen.getByRole('button', { name: 'Unavailable' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'This report has expired. Generate a new one.');
  });

  it('shows a toast and does not throw when the download fails', async () => {
    mockGetReportFileBlobUrl.mockRejectedValue(new Error('network error'));
    const job = mockReportJob({ status: 'completed' });
    render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} /></tbody></table>);

    fireEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to download report. Please try again.', 'error'));
  });

  it('shows the own logo of the form from the forms list, the same mark as the Forms page', () => {
    const job = mockReportJob({ status: 'completed', formId: 'f-logo', formTitle: 'Kala Chasma' });
    const marks = new Map([['f-logo', { logoUrl: 'https://cdn.example.com/kala.png' }]]);
    const { container } = render(<table><tbody><ReportJobRow job={job} onRetry={vi.fn()} formMarkById={marks} /></tbody></table>);
    expect(container.querySelector('img[src="https://cdn.example.com/kala.png"]')).not.toBeNull();
  });
});
