/**
 * __tests__/app/w/[slug]/page.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.6, §12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceHomePage from '@/app/w/[slug]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGetForms = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: {
    getForms: (...args: unknown[]) => mockGetForms(...args),
  },
}));

const mockListGrants = vi.fn();
vi.mock('@/services/formAccess', () => ({
  formAccessService: {
    listGrants: (...args: unknown[]) => mockListGrants(...args),
    grant: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock('@/components/common/Toast', () => ({
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
    expect(screen.getByRole('link', { name: /Create Form/ })).toBeInTheDocument();
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
    expect(screen.getByText('Customer Survey')).toBeInTheDocument();
    // Quick actions
    expect(screen.getByRole('link', { name: /View Tables/ })).toBeInTheDocument();
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
});
