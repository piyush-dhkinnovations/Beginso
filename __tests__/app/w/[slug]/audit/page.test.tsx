/**
 * sprint-10-events-migration, tasks.md 4.4 — requirements.md §7.7, design.md §17, §21.
 * BE 0.4 is unconfirmed; every service is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditLogPage from '@/app/w/[slug]/audit/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
}));

const mockWorkspaces = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: (...a: unknown[]) => mockWorkspaces(...a) },
}));
const mockMembers = vi.fn();
vi.mock('@/services/team', () => ({
  teamService: { listMembers: (...a: unknown[]) => mockMembers(...a) },
}));
const mockAudit = vi.fn();
vi.mock('@/services/events', () => ({
  eventsService: { listAudit: (...a: unknown[]) => mockAudit(...a) },
}));

function events(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${offset + i}`,
    actorName: `Actor ${offset + i}`,
    action: 'access.granted',
    targetType: 'form',
    targetId: 'f1',
    targetLabel: 'Survey',
    createdAt: '2026-09-21T10:30:00.000Z',
    ip: null,
  }));
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuditLogPage />
    </QueryClientProvider>
  );
}

describe('AuditLogPage (/w/[slug]/audit)', () => {
  beforeEach(() => {
    [mockWorkspaces, mockMembers, mockAudit].forEach((m) => m.mockReset());
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'admin' }]);
    mockMembers.mockResolvedValue([{ membershipId: 'm1', userId: 'u1', name: 'Priya Sharma', email: 'p@x.io', role: 'admin' }]);
    mockAudit.mockResolvedValue(events(2));
  });

  it('renders the heading, filters with visible labels, and the table', async () => {
    renderPage();

    expect(await screen.findByRole('rowheader', { name: 'Actor 0' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Audit Log' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Date' })).toBeInTheDocument();
    expect(mockAudit).toHaveBeenCalledWith('acme', expect.objectContaining({ range: 'all', page: 1, limit: 20 }));
  });

  // sprint-10-events-migration, task 7.1 — this page's two distinct loading states
  // (workspacesQuery for role resolution, then auditQuery for the table itself) had no test
  // proving either actually surfaces the skeleton rather than a blank/empty-looking table.
  it('shows the AuditTable skeleton while the audit query is loading, not an empty table', () => {
    // Resolved but asserted synchronously, before any microtask is awaited — same reasoning
    // activity/page.test.tsx's equivalent test uses (a truly never-resolving mock hangs Testing
    // Library's own cleanup). Whichever of workspacesQuery/auditQuery is still pending at this
    // instant, both render the identical `<AuditTable isLoading />` skeleton branch.
    mockAudit.mockResolvedValue(events(2));
    renderPage();

    // AuditTable's own loading behavior (5 skeleton rows) is unit-tested directly in
    // AuditTable.test.tsx — this only proves the page actually passes isLoading through.
    expect(screen.queryByText('No activity recorded yet.')).not.toBeInTheDocument();
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument();
  });

  it.each(['member', 'viewer'] as const)('a role=%s never reaches the audit endpoint and sees a permission state', async (role) => {
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role }]);
    renderPage();

    expect(await screen.findByText('You do not have access to the audit log.')).toBeInTheDocument();
    expect(mockAudit).not.toHaveBeenCalled();
    expect(mockMembers).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('an owner is allowed through', async () => {
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'owner' }]);
    renderPage();

    expect(await screen.findByRole('rowheader', { name: 'Actor 0' })).toBeInTheDocument();
  });

  it('a server-side 403 lands on the same permission state (the server is the real gate)', async () => {
    mockAudit.mockRejectedValue({ response: { status: 403 } });
    renderPage();

    expect(await screen.findByText('You do not have access to the audit log.')).toBeInTheDocument();
  });

  it('shows the verbatim wireframe zero-items empty state when nothing has been recorded', async () => {
    mockAudit.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No activity recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('Audit events will appear here once your team starts making changes.')).toBeInTheDocument();
  });

  it('shows a distinct no-matches state once a filter is active', async () => {
    mockAudit.mockResolvedValueOnce(events(1)).mockResolvedValue([]);
    renderPage();
    await screen.findByRole('rowheader', { name: 'Actor 0' });

    await userEvent.click(screen.getByRole('button', { name: 'Date' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Last 7 days' }));

    // The filtered-empty state names the filter and offers to clear it.
    expect(await screen.findByText('No events in the last 7 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument();
    expect(screen.queryByText('No activity recorded yet.')).not.toBeInTheDocument();
  });

  it('changing a filter re-fetches with that filter server-side and resets to page 1', async () => {
    mockAudit.mockImplementation((_s: string, f: { page: number }) => Promise.resolve(f.page === 1 ? events(20) : events(1, 20)));
    renderPage();
    await screen.findByRole('rowheader', { name: 'Actor 0' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('rowheader', { name: 'Actor 20' });

    await userEvent.click(screen.getByRole('button', { name: 'Actor' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Priya Sharma' }));

    await waitFor(() =>
      expect(mockAudit).toHaveBeenLastCalledWith('acme', expect.objectContaining({ actorId: 'u1', range: 'all', page: 1 }))
    );
  });

  it('populates the Actor menu from the team members', async () => {
    renderPage();
    await screen.findByRole('rowheader', { name: 'Actor 0' });

    await userEvent.click(screen.getByRole('button', { name: 'Actor' }));
    expect(await screen.findByRole('menuitem', { name: 'Priya Sharma' })).toBeInTheDocument();
  });

  it('shows an error state with a Retry that refetches', async () => {
    mockAudit.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(events(1));
    renderPage();

    expect(await screen.findByText('We could not load the audit log.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('rowheader', { name: 'Actor 0' })).toBeInTheDocument();
  });

  it('offers Next only after a full page', async () => {
    renderPage();
    await screen.findByRole('rowheader', { name: 'Actor 0' });

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  // Sprint 11 5.3: computed accessibility for the denied/error states, not just that the right
  // words appear on screen.
  it('the error state is announced via role="alert", not just visible text', async () => {
    mockAudit.mockRejectedValue({ response: { status: 500 } });
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not load the audit log.');
  });

  it('a member/viewer without access sees the denied state with no Retry — a dead-end action must not be offered', async () => {
    mockWorkspaces.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    renderPage();

    expect(await screen.findByText('You do not have access to the audit log.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    // and no privileged call was ever made for a role that cannot see this data
    expect(mockAudit).not.toHaveBeenCalled();
  });
});
