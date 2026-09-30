/**
 * __tests__/components/dashboard/TopNav.test.tsx
 * Audit remediation: zero test coverage. Tests: renders the brand + user
 * dropdown, and the documented mobile navigation is provided below it by DashboardShell.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopNav } from '@/components/dashboard/TopNav';

vi.mock('@/components/dashboard/UserProfileDropdown', () => ({
  UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

// Sprint 12 (inbox-collaboration), task 4.5: NotificationBell (rendered inside TopNav) now calls
// next/navigation's useRouter for the mention/assignment click-through — mocked the same way
// NotificationBell.test.tsx does.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockGetNotifications = vi.fn();
vi.mock('@/services/notifications', () => ({
  notificationsService: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    markAsRead: vi.fn(),
  },
}));

function renderTopNav() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TopNav />
    </QueryClientProvider>
  );
}

describe('TopNav component', () => {
  beforeEach(() => {
    mockGetNotifications.mockReset().mockResolvedValue([]);
  });

  it('renders the Beginso brand', () => {
    renderTopNav();
    expect(screen.getByText('Beginso')).toBeInTheDocument();
  });

  it('renders the user profile dropdown', () => {
    renderTopNav();
    expect(screen.getByTestId('user-profile-dropdown')).toBeInTheDocument();
  });

  it('keeps the notification control at least 44px square', () => {
    renderTopNav();
    expect(screen.getByLabelText('View notifications')).toHaveClass('min-h-11', 'min-w-11');
  });
});
