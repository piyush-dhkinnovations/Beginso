/**
 * sprint-10-events-migration, tasks.md 4.2 — requirements.md §7.6, design.md §17.
 * BE 0.3 is unconfirmed; the events service is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceActivityPage from '@/app/w/[slug]/activity/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
}));

const mockList = vi.fn();
vi.mock('@/services/events', () => ({
  eventsService: { listWorkspaceActivity: (...a: unknown[]) => mockList(...a) },
}));

function events(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${offset + i}`,
    actorName: `Actor ${offset + i}`,
    action: 'form.published',
    targetType: 'form',
    targetId: 'f1',
    targetLabel: 'Survey',
    createdAt: new Date().toISOString(),
  }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceActivityPage />
    </QueryClientProvider>
  );
}

describe('WorkspaceActivityPage', () => {
  beforeEach(() => mockList.mockReset());

  it('renders the heading and events, querying the workspace by slug', async () => {
    mockList.mockResolvedValue(events(3));
    renderPage();

    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith('acme', 1, 20);
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  // sprint-10-events-migration, task 7.1 — this page's own loading state (a 6-row skeleton,
  // per the component's own markup) had no test asserting it actually renders before data
  // arrives, unlike the empty/error states below.
  it('shows a loading state before the query resolves, not the empty state', () => {
    // Resolved, but the assertion below runs before this microtask is awaited anywhere — same
    // synchronous-first-paint pattern already used elsewhere in this test suite for a loading
    // check (a truly never-resolving promise hangs Testing Library's own cleanup).
    mockList.mockResolvedValue([]);
    renderPage();

    expect(screen.getByLabelText('Loading activity')).toBeInTheDocument();
    expect(screen.queryByText('Nothing has happened yet.')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is no activity', async () => {
    mockList.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Nothing has happened yet.')).toBeInTheDocument();
  });

  it('shows an error state with a Retry that refetches', async () => {
    mockList.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(events(1));
    renderPage();

    expect(await screen.findByText('We could not load activity.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
  });

  it('offers Next only after a full page, and pages forward and back', async () => {
    mockList.mockImplementation((_slug: string, page: number) =>
      Promise.resolve(page === 1 ? events(20) : events(2, 20))
    );
    renderPage();

    await screen.findByText('Actor 0');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Actor 20')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith('acme', 2, 20);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
  });
});
