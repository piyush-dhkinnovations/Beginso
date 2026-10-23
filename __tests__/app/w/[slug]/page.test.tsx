/**
 * __tests__/app/w/[slug]/page.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.6, §12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceHomePage from '@/app/w/[slug]/page';
import { eventsService } from '@/services/events';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGetForms = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: {
    getForms: (...args: unknown[]) => mockGetForms(...args),
    getAllForms: (...args: unknown[]) => mockGetForms(...args),
  },
}));

vi.mock('@/services/events', () => ({
  eventsService: { listWorkspaceActivity: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: vi.fn().mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'owner' }]) },
}));

const mockListGrants = vi.fn();
vi.mock('@/services/formAccess', () => ({
  formAccessService: {
    listGrants: (...args: unknown[]) => mockListGrants(...args),
    grant: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { name: 'Piyush Prajapat' }, isLoading: false, isAuthenticated: true }) }));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceHomePage />
    </QueryClientProvider>
  );
}

describe('WorkspaceHomePage (/w/[slug]/page)', () => {
  beforeEach(() => {
    mockGetForms.mockReset();
    mockListGrants.mockReset();
    mockListGrants.mockResolvedValue([]);
  });

  it('shows a skeleton while loading', () => {
    // Never resolves during this test — keeps isLoading: true
    mockGetForms.mockReturnValue(new Promise(() => {}));
    renderPage();

    // Skeletons are aria-hidden, so look for structural elements present only in loading
    // (stat-card skeleton cards come through as plain divs with aria-hidden skeletons inside)
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('shows an error card with retry when the query fails', async () => {
    mockGetForms.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText('Unable to load workspace data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('shows the empty state for a brand-new workspace with no forms', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 20 });
    renderPage();

    expect(await screen.findByText('Welcome to your workspace!')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Create Form/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Browse Templates/ })).toBeInTheDocument();
  });

  it('shows the populated state — stat cards, quick actions, pinned form — when forms exist', async () => {
    mockGetForms.mockResolvedValue({
      forms: [
        {
          _id: 'f1',
          title: 'Customer Survey',
          status: 'published',
          responseCount: 42,
          updatedAt: new Date().toISOString(),
          fields: [], pages: [], branding: {}, settings: { honeypotEnabled: true },
          workspaceId: 'w1', schemaVersion: 1, createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderPage();

    // Stat cards
    expect(await screen.findByText('Total Forms')).toBeInTheDocument();
    expect(screen.getByText('Active Forms')).toBeInTheDocument();
    // Pinned form title
    // Shown as the pinned form and again as a row in the new "Responses by form" chart.
    expect(screen.getAllByText('Customer Survey').length).toBeGreaterThanOrEqual(1);
    // Quick actions
    expect(screen.getByRole('link', { name: /All responses/ })).toBeInTheDocument();
  });

  it('links to the correct edit URL for each pinned form', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{
        _id: 'f99', title: 'My Form', status: 'draft', responseCount: 0,
        updatedAt: new Date().toISOString(), fields: [], pages: [], branding: {},
        settings: { honeypotEnabled: true }, workspaceId: 'w1', schemaVersion: 1,
        createdAt: new Date().toISOString(),
      }],
      total: 1, page: 1, limit: 20,
    });
    renderPage();

    const editLink = await screen.findByRole('link', { name: /Edit/ });
    // `?ws=acme` hint carried so PersonalShell can paint the workspace sidebar on the next
    // page's first render instead of flashing Personal (real bug this fixed).
    expect(editLink).toHaveAttribute('href', '/forms/f99/edit?ws=acme');
  });

  // Real bug found and fixed: this row action used to link to /w/[slug]/share, a route that
  // doesn't exist and dropped the form's own id — always a dead 404. Now opens FormAccessPanel
  // (Sprint 9) for the specific form instead.
  it('clicking Share opens FormAccessPanel for that specific form, not a dead link', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{
        _id: 'f42', title: 'Customer Survey', status: 'draft', responseCount: 0,
        updatedAt: new Date().toISOString(), fields: [], pages: [], branding: {},
        settings: { honeypotEnabled: true }, workspaceId: 'w1', schemaVersion: 1,
        createdAt: new Date().toISOString(),
      }],
      total: 1, page: 1, limit: 20,
    });
    renderPage();

    const shareButton = await screen.findByRole('button', { name: /Share/ });
    await userEvent.click(shareButton);

    expect(await screen.findByText('Share access to Customer Survey')).toBeInTheDocument();
    expect(mockListGrants).toHaveBeenCalledWith('f42');
  });
  it('shows the picture of whoever acted in Recent Activity, not only initials', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{ _id: 'f1', title: 'Survey', status: 'published', responseCount: 1, updatedAt: new Date().toISOString(), fields: [], pages: [], branding: {}, settings: { honeypotEnabled: true }, workspaceId: 'w1', schemaVersion: 1, createdAt: new Date().toISOString() }],
      total: 1, page: 1, limit: 20,
    });
    vi.mocked(eventsService.listWorkspaceActivity).mockResolvedValueOnce([
      { id: 'e1', actorName: 'Piyush Prajapat', actorAvatarUrl: 'https://cdn.example.com/p.png', action: 'export.csv', targetType: 'report', targetLabel: 'csv report', createdAt: new Date().toISOString() },
    ] as never);
    renderPage();
    await screen.findByText('Piyush Prajapat');
    expect(document.querySelector('img[src="https://cdn.example.com/p.png"]')).not.toBeNull();
  });
  it('welcomes the person by first name, with the one-line description, instead of just "Home"', async () => {
    mockGetForms.mockResolvedValue({ forms: [], total: 0, page: 1, limit: 20 });
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Welcome back, Piyush' })).toBeInTheDocument();
    expect(screen.getByText('Your forms and activity at a glance.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
  });
  it('has one header button, Create Form (Customize aside); Templates is a Quick action, not a third header button', async () => {
    mockGetForms.mockResolvedValue({
      forms: [{ _id: 'f1', title: 'Customer Survey', status: 'published', responseCount: 42, updatedAt: new Date().toISOString(), fields: [], pages: [], branding: {}, settings: { honeypotEnabled: true }, workspaceId: 'w1', schemaVersion: 1, createdAt: new Date().toISOString() }],
      total: 1, page: 1, limit: 20,
    });
    renderPage();
    await screen.findByText('Total Forms'); // the page itself, not its loading skeleton (which has the same heading)
    expect(screen.getByRole('heading', { name: 'Welcome back, Piyush' })).toBeInTheDocument();
    // Create Form is the header's button (and "Templates" is no longer one beside it): its only link left is the Quick action
    expect(screen.getAllByRole('link', { name: /Create Form/ }).length).toBeGreaterThan(0);
    const templates = await screen.findAllByRole('link', { name: /Templates/ });
    expect(templates).toHaveLength(1);
    expect(templates[0]).toHaveAttribute('href', '/w/acme/templates');
    expect(templates[0].closest('a')!.querySelector('button')).toBeNull(); // a Quick action link, not a button inside a link
  });
});
