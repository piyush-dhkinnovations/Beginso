/**
 * sprint-10-events-migration, tasks.md 3.3 — requirements.md §7.2–7.5, design.md §5, §17.
 * Backend contracts BE 0.5/0.6/0.7 are unconfirmed; every service is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FormOverviewPage from '@/app/(user)/forms/[id]/overview/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'f1' }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/forms/f1/overview',
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockOverview = vi.fn();
vi.mock('@/services/forms', () => ({ formsService: { getFormOverview: (...a: unknown[]) => mockOverview(...a) } }));
const mockGrants = vi.fn();
vi.mock('@/services/formAccess', () => ({
  formAccessService: { listGrants: (...a: unknown[]) => mockGrants(...a), grant: vi.fn(), revoke: vi.fn() },
}));
const mockEvents = vi.fn();
vi.mock('@/services/events', () => ({ eventsService: { listFormEvents: (...a: unknown[]) => mockEvents(...a) } }));
const mockResponses = vi.fn();
vi.mock('@/services/responses', () => ({ responsesService: { getResponses: (...a: unknown[]) => mockResponses(...a) } }));
const mockWorkspaces = vi.fn();
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: (...a: unknown[]) => mockWorkspaces(...a) } }));

const STATS = { responseCount: 4, responseCountThisWeek: 1, completionRate: null };
function form(over: Record<string, unknown> = {}) {
  return { _id: 'f1', title: 'Customer Survey', status: 'published', slug: 'abc123', workspaceId: null, responseCount: 4, ...over };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormOverviewPage />
    </QueryClientProvider>
  );
}

describe('FormOverviewPage', () => {
  beforeEach(() => {
    [mockOverview, mockGrants, mockEvents, mockResponses, mockWorkspaces].forEach((m) => m.mockReset());
    mockOverview.mockResolvedValue({ form: form(), stats: STATS });
    mockGrants.mockResolvedValue([]);
    mockEvents.mockResolvedValue([]);
    mockResponses.mockResolvedValue({ data: [], total: 0, page: 1, limit: 5, totalPages: 0 });
    mockWorkspaces.mockResolvedValue([]);
  });

  it('renders the title, stats and empty activity state', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(await screen.findByText('Just you')).toBeInTheDocument();
    expect(await screen.findByText('Nothing has happened here yet.')).toBeInTheDocument();
    expect(screen.getByLabelText('Completion rate not tracked yet')).toBeInTheDocument();
  });

  it('a workspace form gets Edit/Share actions for an editor', async () => {
    mockOverview.mockResolvedValue({ form: form({ workspaceId: 'w1' }), stats: STATS });
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'member' }]);
    renderPage();

    expect(await screen.findByRole('button', { name: 'Edit form' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    expect(await screen.findByText('Workspace team')).toBeInTheDocument();
  });

  it('a Reviewer sees Preview only', async () => {
    mockOverview.mockResolvedValue({ form: form({ workspaceId: 'w1' }), stats: STATS });
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    renderPage();

    await screen.findByRole('button', { name: 'Preview' });
    expect(screen.queryByRole('button', { name: 'Edit form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('fails closed on a workspace form whose role is not yet known — Preview only', async () => {
    mockOverview.mockResolvedValue({ form: form({ workspaceId: 'w1' }), stats: STATS });
    mockWorkspaces.mockResolvedValue([]);
    renderPage();

    await screen.findByRole('button', { name: 'Preview' });
    expect(screen.queryByRole('button', { name: 'Edit form' })).not.toBeInTheDocument();
  });

  it('shows the per-form grant count', async () => {
    mockGrants.mockResolvedValue([{ userId: 'u1', email: 'a@b.c', role: 'member', accessLevel: 'write' }]);
    renderPage();

    expect(await screen.findByText('1 person')).toBeInTheDocument();
  });

  it('lists events and offers View all when more than 5 exist', async () => {
    mockEvents.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => ({
        id: `e${i}`, actorName: `Actor ${i}`, action: 'form.published', targetType: 'form',
        targetId: 'f1', targetLabel: 'Customer Survey', createdAt: new Date().toISOString(),
      }))
    );
    renderPage();

    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
    expect(screen.queryByText('Actor 5')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(await screen.findByRole('dialog', { name: 'Form activity' })).toBeInTheDocument();
  });

  it('activity failing to load does not take the rest of the page down', async () => {
    mockEvents.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText('Could not load activity.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows a permission state on 403 (BE 0.7 — 403 on a just-created own form is an open backend bug)', async () => {
    mockOverview.mockRejectedValue({ response: { status: 403 } });
    renderPage();

    expect(await screen.findByText('You do not have access to this form.')).toBeInTheDocument();
  });

  it('shows a not-found state on 404', async () => {
    mockOverview.mockRejectedValue({ response: { status: 404 } });
    renderPage();

    expect(await screen.findByText('This form could not be found.')).toBeInTheDocument();
  });

  it('shows a generic error with a Retry that refetches', async () => {
    mockOverview.mockRejectedValueOnce({ response: { status: 500 } });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows recent responses with a View inbox link', async () => {
    mockResponses.mockResolvedValue({
      data: [{ _id: 'r1', formId: 'f1', answers: { Name: 'Ada' }, status: 'new', submittedAt: new Date().toISOString() }],
      total: 1, page: 1, limit: 5, totalPages: 1,
    });
    renderPage();

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View inbox' })).toHaveAttribute('href', '/forms/f1/inbox');
  });
});
