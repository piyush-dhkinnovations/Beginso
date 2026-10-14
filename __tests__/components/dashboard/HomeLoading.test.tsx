/**
 * Feature: one loading state for the Home page
 * Tests: the page shows a single page-shaped skeleton (not several different ones in turn) until everything it needs has
 * loaded, and the route's loading.tsx shows that same skeleton.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const auth = { isLoading: false, isAuthenticated: true, user: { name: 'U' } };
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));

import DashboardPage from '@/app/(user)/dashboard/page';
import Loading from '@/app/(user)/dashboard/loading';

const ANALYTICS = { totalForms: 2, publishedForms: 1, totalResponses: 5, responsesThisMonth: 1, recentActivity: [] };

/** Per-query state, keyed by the first part of the query key. */
function queries(state: { analytics: object; forms: object; layout?: object }) {
  mockUseQuery.mockImplementation((options: { queryKey: unknown[] }) => {
    const [root, kind] = options.queryKey as string[];
    if (root === 'dashboard' && kind === 'analytics') return { refetch: vi.fn(), isError: false, ...state.analytics };
    if (root === 'dashboard' && kind === 'layout') return { data: undefined, ...(state.layout ?? { isLoading: false }) };
    if (root === 'dashboard') return { data: undefined, isLoading: false };
    return state.forms;
  });
}

const FORMS_LOADED = { data: { forms: [{ _id: 'f1', title: 'My form', status: 'published', responseCount: 1, updatedAt: '2026-10-01' }], total: 2, page: 1, limit: 5 }, isLoading: false };

describe('Home loading', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    auth.isLoading = false;
  });

  it('while the forms list loads: the real header plus ONE skeleton region, and nothing else', () => {
    queries({ analytics: { data: ANALYTICS, isLoading: false }, forms: { data: undefined, isLoading: true } });
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText('Create your first form')).not.toBeInTheDocument();
  });

  it('while signing in: the same single skeleton', () => {
    auth.isLoading = true;
    queries({ analytics: { data: undefined, isLoading: true }, forms: { data: undefined, isLoading: true } });
    render(<DashboardPage />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('with forms but the stats still loading: keeps the one skeleton instead of showing a half-built page', () => {
    queries({ analytics: { data: undefined, isLoading: true }, forms: FORMS_LOADED });
    render(<DashboardPage />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.queryByText('Your forms')).not.toBeInTheDocument();
  });

  it('with forms but the widget layout still loading: still the one skeleton', () => {
    queries({ analytics: { data: ANALYTICS, isLoading: false }, forms: FORMS_LOADED, layout: { isLoading: true } });
    render(<DashboardPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Your forms')).not.toBeInTheDocument();
  });

  it('once everything has loaded there is no skeleton left', () => {
    queries({ analytics: { data: ANALYTICS, isLoading: false }, forms: FORMS_LOADED, layout: { isLoading: false, data: null } });
    render(<DashboardPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Your forms')).toBeInTheDocument();
  });

  it('a zero-forms account goes straight from the skeleton to the empty state (it never waits for the widget layout)', () => {
    queries({ analytics: { data: { ...ANALYTICS, totalForms: 0 }, isLoading: false }, forms: { data: { forms: [], total: 0, page: 1, limit: 5 }, isLoading: false } });
    render(<DashboardPage />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByText('Create your first form').length).toBeGreaterThan(0);
  });

  it("the route's loading.tsx is the same header and the same skeleton", () => {
    render(<Loading />);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByText('Personal space')).toBeInTheDocument();
  });
});
