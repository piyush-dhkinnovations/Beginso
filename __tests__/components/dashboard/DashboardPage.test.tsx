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
    mockUseQuery.mockReturnValue({
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
      '/responses?responseId=response-1'
    );
  });
});
