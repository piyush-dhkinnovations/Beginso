import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import type { Role } from '@/types/workspace';

vi.mock('@/components/dashboard/UserProfileDropdown', () => ({ UserProfileDropdown: () => null }));

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: () => Promise.resolve([]) },
}));

vi.mock('@/services/responses', () => ({
  responsesService: { getStats: () => Promise.resolve({ total: 77, unread: 70 }) },
}));

function renderSidebar(props: { slug: string; currentLabel: string; collapsed?: boolean; role?: Role }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceSidebar {...props} />
    </QueryClientProvider>
  );
}

describe('WorkspaceSidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/w/acme');
  });

  it('renders every real workspace nav item, scoped under the workspace slug', () => {
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    ['Home', 'Forms'].forEach((label) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', expect.stringContaining('/w/acme'));
    });
  });

  it('labels the Responses badge as unread, so 70 beside a dashboard total of 77 reads as a different number', async () => {
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    const link = await screen.findByRole('link', { name: 'Responses 70 unread' });
    expect(within(link).getByText('70')).toHaveAttribute('title', '70 unread');
  });

  it('links Insights (a real page) and lights it instead of Responses on /w/[slug]/insights', () => {
    mockPathname.mockReturnValue('/w/acme/insights');
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/w/acme/insights');
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Responses/ })).not.toHaveAttribute('aria-current');
  });

  // A link to a page that does not exist under /w/[slug] is a dead link (always 404). The old
  // "Analytics" and "Reports" names are not sidebar items.
  it('does not render links to pages that do not exist yet under /w/[slug]', () => {
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role: 'owner' });
    ['Analytics', 'Reports'].forEach((label) => {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    });
  });

  it('renders the context switcher as the sidebar\'s own header, showing the workspace name', () => {
    // The switcher lives in the sidebar
    // itself, not the top bar — this is the regression test for that placement.
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch context/ })).toBeInTheDocument();
  });

  it('marks Home active on the workspace root only', () => {
    mockPathname.mockReturnValue('/w/acme');
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Forms' })).not.toHaveAttribute('aria-current');
  });

  it('marks Forms active on /w/[slug]/forms and its subroutes', () => {
    mockPathname.mockReturnValue('/w/acme/forms/f1');
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    expect(screen.getByRole('link', { name: 'Forms' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('does not leak another workspace\'s active state', () => {
    mockPathname.mockReturnValue('/w/other-workspace/forms');
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
    expect(screen.getByRole('link', { name: 'Forms' })).not.toHaveAttribute('aria-current');
  });

  // Role-gated "Team" nav item.
  describe('Team nav item (role-gated)', () => {
    it('is hidden when role is undefined (BE 0.1 not yet shipped — fails closed)', () => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
      expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    });

    it.each(['viewer', 'member'] as const)('is hidden for role=%s', (role) => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role });
      expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
    });

    it.each(['owner', 'admin'] as const)('is visible for role=%s, scoped under the workspace slug', (role) => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role });
      expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/w/acme/team');
    });
  });

  // Role-gated "Audit Log", same fail-closed pattern as Team.
  describe('Audit Log nav item (role-gated)', () => {
    it.each([undefined, 'viewer', 'member'] as const)('is hidden for role=%s', (role) => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role });
      expect(screen.queryByRole('link', { name: 'Audit log' })).not.toBeInTheDocument();
    });

    it.each(['owner', 'admin'] as const)('is visible for role=%s, scoped under the workspace slug', (role) => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role });
      expect(screen.getByRole('link', { name: 'Audit log' })).toHaveAttribute('href', '/w/acme/audit');
    });
  });

  // "Activity" is visible to every role, unlike Team.
  describe('Activity nav item (all roles)', () => {
    it.each([undefined, 'viewer', 'member', 'admin', 'owner'] as const)('is visible for role=%s', (role) => {
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role });
      expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '/w/acme/activity');
    });

    it('is marked active on /w/[slug]/activity', () => {
      mockPathname.mockReturnValue('/w/acme/activity');
      renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc' });
      expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    });
  });

});
