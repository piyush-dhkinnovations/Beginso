import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetResponses = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: (...args: unknown[]) => mockGetResponses(...args) },
}));

import { ResponsesChart } from '@/components/responses/ResponsesChart';
import type { ResponseStats } from '@/types/response';

const STATS: ResponseStats = {
  total: 10,
  unread: 2,
  byStage: [
    { stageId: 's1', name: 'New', category: 'new', count: 4 },
    { stageId: 's2', name: 'Done', category: 'completed', count: 6 },
  ],
  byCategory: { new: 4, in_progress: 0, completed: 6 },
};

function renderChart(overrides: Partial<Parameters<typeof ResponsesChart>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponsesChart
        scope="acme"
        filters={{}}
        stats={STATS}
        statsLoading={false}
        statsError={false}
        onRetryStats={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>
  );
}

describe('ResponsesChart', () => {
  beforeEach(() => {
    mockGetResponses.mockReset().mockResolvedValue({
      data: [{ _id: 'r1', submittedAt: '2026-09-10T00:00:00.000Z' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
  });

  it('renders both charts with their sr-only data-table alternative', async () => {
    renderChart();

    await waitFor(() => expect(screen.getByRole('group', { name: 'Daily submissions volume' })).toBeInTheDocument());

    const tables = document.querySelectorAll('table.sr-only');
    expect(tables).toHaveLength(2);
    expect(tables[1].textContent).toContain('New');
    expect(tables[1].textContent).toContain('Done');
  });

  it('shows the stage-distribution empty state when there are no responses yet', () => {
    renderChart({ stats: { ...STATS, total: 0, byStage: [] } });
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
  });

  it('shows an inline retry when stats failed to load, without blocking the volume chart', async () => {
    const onRetryStats = vi.fn();
    renderChart({ stats: undefined, statsError: true, onRetryStats });

    expect(screen.getByText('Unable to load stage distribution')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Daily submissions volume' })).toBeInTheDocument());
  });
});
