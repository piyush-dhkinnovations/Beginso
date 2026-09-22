/**
 * __tests__/components/workspaces/PersonalSidebar.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.3 (corrected Day 3 against A1.1/A1.3)
 * Extended: PersonalSidebar now also carries the context switcher header (closing the gap where
 * Personal space had no discoverable path into a workspace) and the four still-live top-level
 * pages (Responses/Analytics/Reports/Settings) — see the component's own comment.
 * Sprint 9 Day 5 (requirements.md §7.9): "Shared with me" is now a permanent item, closing the
 * gap this file's own comment previously named this sprint as fixing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: () => Promise.resolve([]) },
}));

const mockGetAnalytics = vi.fn();
vi.mock('@/services/dashboard', () => ({
  dashboardService: { getAnalytics: () => mockGetAnalytics() },
}));

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PersonalSidebar />
    </QueryClientProvider>
  );
}

describe('PersonalSidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
    mockGetAnalytics.mockReset();
    mockGetAnalytics.mockResolvedValue({
      totalForms: 0,
      publishedForms: 0,
      totalResponses: 0,
      responsesThisMonth: 0,
      recentActivity: [],
    });
  });

  it('renders the real A1.1 personal nav set plus the still-live top-level pages', () => {
    renderSidebar();
    ['Home', 'My Forms', 'Shared with me', 'Templates', 'Responses', 'Analytics', 'Reports', 'Settings', 'Create workspace'].forEach(
      (label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    );
  });

  it('renders the context switcher as the sidebar\'s own header, showing Personal', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /Switch context, currently Personal/ })).toBeInTheDocument();
  });

  it('renders Shared with me as a permanent item, scoped to /shared; My Submissions remains a deferred, tracked gap', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Shared with me' })).toHaveAttribute('href', '/shared');
    expect(screen.queryByText('My Submissions')).not.toBeInTheDocument();
  });

  it('marks Shared with me active on /shared', () => {
    mockPathname.mockReturnValue('/shared');
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Shared with me' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Home active on /dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');
    renderSidebar();
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks My Forms active on /forms and its subroutes', () => {
    mockPathname.mockReturnValue('/forms/abc123');
    renderSidebar();
    expect(screen.getByRole('link', { name: /My Forms/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Templates active on /templates', () => {
    mockPathname.mockReturnValue('/templates');
    renderSidebar();
    expect(screen.getByRole('link', { name: /Templates/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Settings active on /settings', () => {
    mockPathname.mockReturnValue('/settings');
    renderSidebar();
    expect(screen.getByRole('link', { name: /Settings/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Responses active on both /responses and a per-form /forms/:id/responses drill-in', () => {
    mockPathname.mockReturnValue('/forms/abc123/responses');
    renderSidebar();
    expect(screen.getByRole('link', { name: /Responses/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Create workspace active on /workspaces', () => {
    mockPathname.mockReturnValue('/workspaces');
    renderSidebar();
    expect(screen.getByRole('link', { name: /Create workspace/ })).toHaveAttribute('aria-current', 'page');
  });

  it('hides Responses/Analytics/Reports once analytics confirms zero forms, keeping the always-relevant items', async () => {
    renderSidebar();
    expect(await screen.findByText('My Forms')).toBeInTheDocument();
    expect(screen.queryByText('Responses')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    ['Home', 'My Forms', 'Shared with me', 'Templates', 'Settings', 'Create workspace'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('keeps Responses visible once forms exist', async () => {
    mockGetAnalytics.mockResolvedValue({
      totalForms: 3,
      publishedForms: 1,
      totalResponses: 5,
      responsesThisMonth: 2,
      recentActivity: [],
    });
    renderSidebar();
    expect(await screen.findByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Responses')).toBeInTheDocument();
  });

  it('keeps Responses visible when already deep-linked onto it, even with zero forms', async () => {
    mockPathname.mockReturnValue('/responses');
    renderSidebar();
    await screen.findByText('My Forms');
    expect(screen.getByRole('link', { name: /Responses/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks nothing active on an unrelated route', () => {
    mockPathname.mockReturnValue('/onboarding');
    renderSidebar();
    ['Home', 'My Forms', 'Shared with me', 'Templates', 'Responses', 'Analytics', 'Reports', 'Settings', 'Create workspace'].forEach(
      (label) => {
        expect(screen.getByRole('link', { name: new RegExp(label) })).not.toHaveAttribute('aria-current');
      }
    );
  });
});
