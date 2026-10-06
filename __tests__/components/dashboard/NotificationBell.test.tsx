/**
 * __tests__/components/dashboard/NotificationBell.test.tsx
 * Tests: unread-dot visibility, opens on click, closes on outside-click/Escape, marking an item
 * read updates the list, empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import type { AppNotification } from '@/types/notification';

// Sprint 12 (inbox-collaboration), task 4.5: clicking a mention/assignment notification now
// routes via next/navigation's useRouter — mocked the same way every other router-dependent
// component test in this repo does, since NotificationBell renders outside an app-router context.
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Sprint 14: the badge reads the polled unread-count query and the list is fetched only when the
// dropdown opens (cursor page: { items, nextCursor }), so the service mock covers list + unreadCount.
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const mockGetNotifications = vi.fn();
const mockUnreadCount = vi.fn();
const mockMarkAsRead = vi.fn();
vi.mock('@/services/notifications', () => ({
  notificationsService: {
    list: async (...args: unknown[]) => ({ items: await mockGetNotifications(...args), nextCursor: null }),
    unreadCount: (...args: unknown[]) => mockUnreadCount(...args),
    markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  },
}));

const NOTIFICATIONS: AppNotification[] = [
  { id: 'welcome-1', type: 'welcome', title: 'Welcome to Beginso!', message: "You're all set.", createdAt: '2026-08-22T08:00:00.000Z', read: false },
  { id: 'pw-1', type: 'password_reset', title: 'Password changed', message: 'Your password was updated.', createdAt: '2026-08-21T08:00:00.000Z', read: true },
];

function renderBell() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationBell />
    </QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    mockGetNotifications.mockReset();
    mockUnreadCount.mockReset().mockResolvedValue(1);
    mockMarkAsRead.mockReset().mockResolvedValue(undefined);
  });

  it('is closed by default', () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    renderBell();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  // Bug fix: the component's unread dot was already correctly moved onto the real design-system
  // token (`bg-(--action-primary)`, part of this sprint's colour-token cleanup) — this assertion
  // still looked for the old literal `.bg-brand-600` class, which no longer exists anywhere.
  // `[class*="action-primary"]` matches the token's actual class string (Tailwind v4's `bg-(--x)`
  // syntax keeps the literal `--x` substring in the rendered class attribute).
  it('shows an unread dot when there is at least one unread notification', async () => {
    const { container } = renderBell();
    await waitFor(() => expect(container.querySelector('[class*="action-primary"]')).toBeInTheDocument());
    // The badge carries the count in the button's accessible name (requirements 11), and nothing is
    // fetched for the list until the dropdown opens.
    expect(screen.getByRole('button', { name: 'View notifications, 1 unread' })).toBeInTheDocument();
    expect(mockGetNotifications).not.toHaveBeenCalled();
  });

  it('shows no unread dot when every notification is already read', async () => {
    mockUnreadCount.mockResolvedValue(0);
    const { container } = renderBell();
    await waitFor(() => expect(mockUnreadCount).toHaveBeenCalled());
    expect(container.querySelector('[class*="action-primary"]')).not.toBeInTheDocument();
  });

  it('opens the dropdown on click and lists every notification', async () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));

    expect(await screen.findByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Beginso!')).toBeInTheDocument();
    expect(screen.getByText('Password changed')).toBeInTheDocument();
  });

  it('shows an empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue([]);
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));
    expect(await screen.findByText('No notifications yet.')).toBeInTheDocument();
  });

  it('marks an unread notification as read when clicked', async () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));

    fireEvent.click(await screen.findByText('Welcome to Beginso!'));
    await waitFor(() => expect(mockMarkAsRead).toHaveBeenCalledWith('welcome-1'));
  });

  it('does not re-mark an already-read notification as read', async () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));

    fireEvent.click(await screen.findByText('Password changed'));
    expect(mockMarkAsRead).not.toHaveBeenCalled();
  });

  it('closes on outside click', async () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <div>
          <div data-testid="outside">outside</div>
          <NotificationBell />
        </div>
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));
    expect(await screen.findByText('Notifications')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    mockGetNotifications.mockResolvedValue(NOTIFICATIONS);
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /^View notifications/ }));
    expect(await screen.findByText('Notifications')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });
});
