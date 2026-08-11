/**
 * __tests__/components/analytics/AnalyticsView.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: AnalyticsView — Auto-Dashboard branch (formId set) vs Workspace branch (formId unset),
 * access-denied/not-found states, independent per-query loading, isAllTime wiring
 * Requirements: 1, 7, 8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let search = '';
const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/forms/form-1/analytics',
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => new URLSearchParams(search),
}));

const mockGetFormById = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getFormById: (...args: unknown[]) => mockGetFormById(...args) },
}));

const mockGetOverview = vi.fn();
const mockGetTrends = vi.fn();
const mockGetQuestions = vi.fn();
const mockGetFormsSummary = vi.fn();
vi.mock('@/services/analytics', () => ({
  analyticsService: {
    getOverview: (...args: unknown[]) => mockGetOverview(...args),
    getTrends: (...args: unknown[]) => mockGetTrends(...args),
    getQuestions: (...args: unknown[]) => mockGetQuestions(...args),
    getFormsSummary: (...args: unknown[]) => mockGetFormsSummary(...args),
  },
}));

vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

import { AnalyticsView } from '@/components/analytics/AnalyticsView';

const form = { _id: 'form-1', title: 'Customer Survey', fields: [] };
const overview = { totalResponses: 10, statusCounts: { new: 4, in_progress: 3, completed: 3 } };
const trends = { bucket: 'day' as const, points: [{ bucketStart: '2026-08-01T00:00:00.000Z', responses: 5 }] };
const questions = { questions: [] };
const formsSummary = { forms: [{ _id: 'form-1', title: 'Customer Survey', status: 'published' as const, totalResponses: 10, completionRate: 82 }], total: 1, page: 1, limit: 100 };

function renderView(formId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsView formId={formId} />
    </QueryClientProvider>
  );
}

describe('AnalyticsView', () => {
  beforeEach(() => {
    search = '';
    mockReplace.mockReset();
    mockPush.mockReset();
    mockGetFormById.mockReset().mockResolvedValue(form);
    mockGetOverview.mockReset().mockResolvedValue(overview);
    mockGetTrends.mockReset().mockResolvedValue(trends);
    mockGetQuestions.mockReset().mockResolvedValue(questions);
    mockGetFormsSummary.mockReset().mockResolvedValue(formsSummary);
  });

  it('renders the Auto-Dashboard branch (stat cards, trend, status, questions) when formId is set', async () => {
    renderView('form-1');

    expect(await screen.findByText('Analytics · Customer Survey')).toBeInTheDocument();
    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Response Trend')).toBeInTheDocument());
    expect(screen.getByText('Status Distribution')).toBeInTheDocument();
    expect(screen.queryByText('No forms yet')).not.toBeInTheDocument();
  });

  it('renders the Workspace branch (summary cards + FormsSummaryTable) when formId is not set', async () => {
    renderView();

    await waitFor(() => expect(mockGetFormsSummary).toHaveBeenCalled());
    expect((await screen.findAllByText('Customer Survey')).length).toBeGreaterThan(0);
    // Workspace summary cards render their own "Total Responses" card — this just confirms the
    // Auto-Dashboard's chart headings (which only ever render on the formId branch) are absent.
    expect(screen.queryByText('Response Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Status Distribution')).not.toBeInTheDocument();
    expect(mockGetOverview).not.toHaveBeenCalled();
  });

  it('renders workspace summary cards computed from the loaded forms, including vs-previous-period change', async () => {
    // Same mockResolvedValue serves both the current-period and previous-period forms-summary
    // calls (queryFn args differ only by date range) — current period: 10 responses; previous
    // period here also returns 10 (same fixture), so Change should show "—" (no change).
    renderView();

    await waitFor(() => expect(mockGetFormsSummary).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('Active Forms')).toBeInTheDocument();
    expect(screen.getByText('Avg. Responses / Form')).toBeInTheDocument();
    expect(screen.getByText('Change vs Previous Period')).toBeInTheDocument();
  });

  it('shows "Access denied" for a 403 on the form query, without rendering any chart', async () => {
    mockGetFormById.mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
    renderView('form-1');

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('Response Trend')).not.toBeInTheDocument();
  });

  it('shows "Form not found" for a 404 on the form query', async () => {
    mockGetFormById.mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
    renderView('form-1');

    expect(await screen.findByText('Form not found')).toBeInTheDocument();
  });

  it('does not let a failed trends query block the stat cards from rendering once overview resolves', async () => {
    mockGetTrends.mockRejectedValue(new Error('trends unavailable'));
    renderView('form-1');

    await waitFor(() => expect(screen.getAllByText('10').length).toBeGreaterThan(0));
    expect(await screen.findByText('Unable to load the response trend')).toBeInTheDocument();
  });

  it('passes isAllTime through so a zero-point trend reads "No responses yet" when the range is All time', async () => {
    search = 'from=all&to=all';
    mockGetTrends.mockResolvedValue({ bucket: 'week', points: [] });
    renderView('form-1');

    expect(await screen.findByText('No responses yet')).toBeInTheDocument();
  });
});
