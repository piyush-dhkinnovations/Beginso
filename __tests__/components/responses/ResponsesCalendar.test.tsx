import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsesCalendar } from '@/components/responses/ResponsesCalendar';
import type { IResponse } from '@/types/response';

const mockGetResponses = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: (...args: unknown[]) => mockGetResponses(...args) },
}));

function fixtureResponse(id: string, submittedAt: string): IResponse {
  return {
    _id: id,
    formId: 'f1',
    reference: `#${id}`,
    answers: { Name: `Person ${id}` },
    stage: { id: 's1', name: 'New', colour: 'info', category: 'new' },
    assignee: null,
    tags: [],
    noteCount: 0,
    attachmentCount: 0,
    unread: false,
    duplicateOfId: null,
    submittedAt,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  };
}

// September 2026 — fixed so the grid always covers the fixtures below regardless of wall-clock time.
const INITIAL_DATE = new Date(Date.UTC(2026, 8, 1));

function renderCalendar(timezone: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponsesCalendar
        scope="acme"
        filters={{}}
        timezone={timezone}
        onViewResponse={vi.fn()}
        initialDate={INITIAL_DATE}
      />
    </QueryClientProvider>
  );
}

describe('ResponsesCalendar', () => {
  beforeEach(() => {
    mockGetResponses.mockReset();
  });

  it('lands a 23:30 UTC submission on the correct local day for an IST workspace', async () => {
    // design.md's own acceptance case for task 3.3.
    mockGetResponses.mockResolvedValue({
      data: [fixtureResponse('r1', '2026-09-15T23:30:00.000Z')],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    });
    renderCalendar('Asia/Kolkata');

    await waitFor(() => expect(screen.getByLabelText(/2026-09-16, 1 response/)).toBeInTheDocument());
    expect(screen.queryByLabelText(/2026-09-15, 1 response/)).not.toBeInTheDocument();
  });

  it('shows a "+N" overflow once a day carries more than 3 items', async () => {
    const items = Array.from({ length: 5 }, (_, i) => fixtureResponse(`r${i}`, '2026-09-10T04:00:00.000Z'));
    mockGetResponses.mockResolvedValue({ data: items, total: 5, page: 1, limit: 50, totalPages: 1 });
    renderCalendar('UTC');

    await waitFor(() => expect(screen.getByText('+2')).toBeInTheDocument());
  });

  it('shows the month-empty state when nothing was submitted', async () => {
    mockGetResponses.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 1 });
    renderCalendar('UTC');

    await waitFor(() => expect(screen.getByText('No responses this month')).toBeInTheDocument());
  });
});
