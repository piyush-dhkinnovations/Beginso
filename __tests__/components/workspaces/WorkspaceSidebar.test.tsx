/**
 * __tests__/components/workspaces/WorkspaceSidebar.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import type { Role } from '@/types/workspace';

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: () => Promise.resolve([]) },
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

  // Real bug found and fixed: Templates/Responses/Analytics/Reports/Settings linked to routes
  // that don't exist under /w/[slug] (only forms/, team/, roles/ do) — dead links, always 404.
  // Removed until each page actually ships.
  it('does not render links to pages that do not exist yet under /w/[slug]', () => {
    renderSidebar({ slug: 'acme', currentLabel: 'Acme Inc', role: 'owner' });
    ['Templates', 'Responses', 'Analytics', 'Reports', 'Settings'].forEach((label) => {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    });
  });

  it('renders the context switcher as the sidebar\'s own header, showing the workspace name', () => {
    // Corrected against the real wireframe (design.md §23): the switcher lives in the sidebar
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

  // Sprint 9 (team-permissions), requirements.md §7.7 — role-gated "Team" nav item.
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

});
