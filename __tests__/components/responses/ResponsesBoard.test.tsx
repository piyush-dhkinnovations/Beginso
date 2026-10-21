import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsesBoard } from '@/components/responses/ResponsesBoard';
import type { StageRef } from '@/types/stage';
import type { IResponse } from '@/types/response';

const mockGetResponses = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: (...args: unknown[]) => mockGetResponses(...args) },
}));

const STAGES: StageRef[] = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  name: `Stage ${i}`,
  colour: 'info',
  category: 'in_progress',
}));

const EMPTY_PAGE = { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };

function fixtureResponse(id: string, stage: StageRef): IResponse {
  return {
    _id: id,
    formId: 'f1',
    reference: `#${id}`,
    answers: { Name: `Person ${id}` },
    stage,
    assignee: null,
    tags: [],
    noteCount: 0,
    attachmentCount: 0,
    unread: false,
    duplicateOfId: null,
    submittedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function renderBoard(overrides: Partial<Parameters<typeof ResponsesBoard>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponsesBoard
        scope="acme"
        filters={{}}
        stages={STAGES}
        stagesLoading={false}
        role="owner"
        onViewResponse={vi.fn()}
        onChangeStage={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>
  );
}

describe('ResponsesBoard', () => {
  beforeEach(() => {
    mockGetResponses.mockReset().mockResolvedValue(EMPTY_PAGE);
  });

  it('renders one column per workspace stage', async () => {
    renderBoard();
    await waitFor(() => expect(mockGetResponses).toHaveBeenCalledTimes(6));
    STAGES.forEach((s) => expect(screen.getByLabelText(`${s.name} column`)).toBeInTheDocument());
  });

  it('shows "No responses in {stage}", not the wireframe\'s drag copy', async () => {
    renderBoard();
    await waitFor(() => expect(screen.getAllByText(/No responses in Stage \d/)).toHaveLength(6));
    expect(screen.queryByText(/drag a card here/i)).not.toBeInTheDocument();
  });

  const originalObserver = globalThis.IntersectionObserver;
  const twoPages = () =>
    mockGetResponses.mockImplementation((params: { stageId: string; page?: number }) =>
      params.stageId === 's0'
        ? Promise.resolve({ data: [fixtureResponse(`r${params.page ?? 1}`, STAGES[0])], total: 2, page: params.page ?? 1, limit: 1, totalPages: 2 })
        : Promise.resolve(EMPTY_PAGE)
    );

  it('loads the next page by itself when the end of a column comes into view', async () => {
    const callbacks: ((e: { isIntersecting: boolean }[]) => void)[] = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) { callbacks.push(cb); }
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    try {
      twoPages();
      renderBoard();
      await screen.findByText('#r1');
      expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
      await waitFor(() => expect(callbacks.length).toBeGreaterThan(0));
      callbacks.at(-1)!([{ isIntersecting: true }]);
      await screen.findByText('#r2');
    } finally {
      vi.stubGlobal('IntersectionObserver', originalObserver);
    }
  });

  it('keeps a "Load more" button where the browser cannot watch scrolling', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    try {
      twoPages();
      renderBoard();
      await waitFor(() => expect(screen.getByText('Load more')).toBeInTheDocument());
    } finally {
      vi.stubGlobal('IntersectionObserver', originalObserver);
    }
  });

  it('shows the empty-pipeline state instead of columns when the workspace has no stages', () => {
    renderBoard({ stages: [] });
    expect(screen.getByText('No pipeline stages yet')).toBeInTheDocument();
  });
});
