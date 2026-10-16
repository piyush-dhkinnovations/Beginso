/** A15-001: a failed forms request used to look like "no forms", telling people who have forms to create their first. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isLoading: false, isAuthenticated: true, user: { name: 'A' } }) }));

import DashboardPage from '@/app/(user)/dashboard/page';

describe('Dashboard when the forms request fails', () => {
  it('shows an error with Try again, not "Create your first form"', () => {
    const refetchForms = vi.fn();
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === 'dashboard') return { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
      return { data: undefined, isLoading: false, isError: true, refetch: refetchForms };
    });
    render(<DashboardPage />);
    expect(screen.queryByText('Create your first form')).not.toBeInTheDocument();
    expect(screen.getByText("We couldn't load your forms")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetchForms).toHaveBeenCalledTimes(1);
  });

  it('still shows the first-form prompt when the request succeeded with zero forms', () => {
    mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
      if (options.queryKey[0] === 'dashboard') {
        return { data: { totalForms: 0, publishedForms: 0, totalResponses: 0, responsesThisMonth: 0, recentActivity: [] }, isLoading: false, isError: false, refetch: vi.fn() };
      }
      return { data: { forms: [], total: 0, page: 1, limit: 5 }, isLoading: false, isError: false, refetch: vi.fn() };
    });
    render(<DashboardPage />);
    expect(screen.getByText('Create your first form')).toBeInTheDocument();
  });
});
