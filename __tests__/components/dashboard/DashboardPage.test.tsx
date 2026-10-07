import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: { name: 'Dashboard User' },
  }),
}));

import DashboardPage from '@/app/(user)/dashboard/page';
import { dashboardService } from '@/services/dashboard';

describe('DashboardPage analytics integration', () => {
  it('uses the dashboard analytics query and renders its monthly total and activity', () => {
    // The page now issues two distinct useQuery calls (analytics + the filtered personal-forms
    // count it uses to override analytics.totalForms — see the page's own "Real bug found and
    // fixed" comment). A single blanket mockReturnValue previously worked because only the
    // first query's data was ever read; branch on queryKey now that both matter.
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === 'dashboard') {
        return {
          data: {
            totalForms: 4,
            publishedForms: 3,
            totalResponses: 28,
            responsesThisMonth: 9,
            recentActivity: [
              {
                id: 'activity-1',
                type: 'response_submitted',
                occurredAt: '2026-08-08T10:00:00.000Z',
                form: { _id: 'form-1', title: 'Lead intake' },
                responseId: 'response-1',
              },
            ],
          },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      return { data: { forms: [], total: 4, page: 1, limit: 5 }, isLoading: false };
    });

    render(<DashboardPage />);

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['dashboard', 'analytics'],
        queryFn: dashboardService.getAnalytics,
        enabled: true,
      })
    );
    expect(screen.getByText('Responses This Month')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('Lead intake')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View response for Lead intake' })).toHaveAttribute(
      'href',
      '/inbox?responseId=response-1'
    );
  });

  it('overrides analytics.totalForms/publishedForms with the filtered personal-forms count when they disagree — the real bug: a brand-new invited user\'s analytics endpoint counted a workspace-owned form as personal, so the stat cards showed "1" while /forms correctly showed none', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === 'dashboard') {
        return {
          data: { totalForms: 1, publishedForms: 1, totalResponses: 0, responsesThisMonth: 0, recentActivity: [] },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      // The filtered query correctly found zero genuine personal forms.
      return { data: { forms: [], total: 0, page: 1, limit: 5 }, isLoading: false };
    });

    render(<DashboardPage />);

    // Stat cards are gated on hasForms, which must now follow the corrected count (0), not the
    // leaked analytics count (1) — so they don't render at all, and the empty state shows instead.
    expect(screen.queryByText('Total Forms')).not.toBeInTheDocument();
    expect(screen.getAllByText('Create your first form').length).toBeGreaterThan(0);
  });

  it('does not flash the stat cards on load for a zero-forms account — the real bug: analyticsLoading resolved before the more reliable forms query, so cards briefly rendered (as a loading skeleton) then vanished once the real answer landed', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === 'dashboard') {
        // Analytics has already resolved (isLoading: false) — this is the exact gap that used
        // to read a stale fallback and show the cards.
        return {
          data: { totalForms: 0, publishedForms: 0, totalResponses: 0, responsesThisMonth: 0, recentActivity: [] },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      // The forms query is still loading — data is undefined.
      return { data: undefined, isLoading: true };
    });

    render(<DashboardPage />);

    expect(screen.queryByText('Total Forms')).not.toBeInTheDocument();
  });
});
