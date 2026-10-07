/**
 * __tests__/qa/roleMatrix.test.tsx
 * sprint-11-v2a-hardening, requirements.md §7.2 (2.1, 2.2)
 *
 * Renders the real shells with mocked services per the ROLE_MATRIX cell and diffs against it by
 * role/name — not by class. Denied cells (none in this nav/shells pass) would additionally assert
 * no privileged service call fires; that assertion applies from task 2.3 onward.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';
import { WORKSPACE_NAV_MATRIX, PERSONAL_NAV_MATRIX } from './roleMatrix.expected';
import type { Role } from '@/types/workspace';

vi.mock('@/components/dashboard/UserProfileDropdown', () => ({ UserProfileDropdown: () => null }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/w/acme',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: () => Promise.resolve([]) },
}));

const mockGetAnalytics = vi.fn();
vi.mock('@/services/dashboard', () => ({
  dashboardService: { getAnalytics: () => mockGetAnalytics() },
}));

const mockGetForms = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: { getForms: (...args: unknown[]) => mockGetForms(...args) },
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Cross-role matrix — WorkspaceSidebar', () => {
  it.each(WORKSPACE_NAV_MATRIX)('role=$role: shows exactly the expected nav items', (cell) => {
    renderWithQuery(<WorkspaceSidebar slug="acme" currentLabel="Acme Inc" role={cell.role as Role} />);

    cell.visible.forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
    cell.hidden.forEach((label) => {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    });
  });
});

describe('Cross-role matrix — PersonalSidebar', () => {
  beforeEach(() => {
    mockGetAnalytics.mockReset();
    mockGetAnalytics.mockResolvedValue({ totalForms: 1, publishedForms: 1, totalResponses: 0, responsesThisMonth: 0, recentActivity: [] });
    mockGetForms.mockReset();
    // hasForms=true state, per this file's own scope note — the empty-account hiding path is
    // PersonalSidebar.test.tsx's job, not this table's.
    mockGetForms.mockResolvedValue({ forms: [{ _id: 'f1' }], total: 1, page: 1, limit: 1 });
  });

  it.each(PERSONAL_NAV_MATRIX)('role=$role (not meaningful in personal context): shows exactly the expected nav items', async (cell) => {
    renderWithQuery(<PersonalSidebar />);

    for (const label of cell.visible) {
      expect(await screen.findByRole('link', { name: label })).toBeInTheDocument();
    }
    cell.hidden.forEach((label) => {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    });
  });
});
