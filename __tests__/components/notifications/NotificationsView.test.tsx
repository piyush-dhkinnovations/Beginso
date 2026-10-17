import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsView } from '@/components/notifications/NotificationsView';
import type { AppNotification, NotificationFilter } from '@/types/notification';

const replace = vi.fn();
const push = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  usePathname: () => '/notifications',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/hooks/useWorkspaceTimezone', () => ({ useWorkspaceTimezone: () => 'UTC' }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

interface ListState {
  isLoading: boolean;
  isError: boolean;
  data?: { pages: { items: AppNotification[] }[] };
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: ReturnType<typeof vi.fn>;
  fetchNextPage: ReturnType<typeof vi.fn>;
}
let list: ListState;
let unread = 0;
const useNotificationsSpy = vi.fn();
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: (scope: string, filter: NotificationFilter) => {
    useNotificationsSpy(scope, filter);
    return list;
  },
}));
vi.mock('@/hooks/useUnreadCount', () => ({ useUnreadCount: () => ({ data: unread }) }));

const markAllMutate = vi.fn();
const markReadMutate = vi.fn();
let markAllPending = false;
vi.mock('@/hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({
    markAllRead: { mutate: markAllMutate, isPending: markAllPending },
    markRead: { mutate: markReadMutate },
  }),
}));

const note = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'form_activity',
  title: `Title ${id}`,
  message: `Message ${id}`,
  createdAt: new Date().toISOString(),
  read: false,
  ...over,
});

const withItems = (items: AppNotification[], over: Partial<ListState> = {}) => {
  list = { ...list, isLoading: false, isError: false, data: { pages: [{ items }] }, ...over };
};

beforeEach(() => {
  search = '';
  unread = 0;
  markAllPending = false;
  [replace, push, mockToast, markAllMutate, markReadMutate, useNotificationsSpy].forEach((m) => m.mockReset());
  list = { isLoading: false, isError: false, data: { pages: [{ items: [] }] }, hasNextPage: false, isFetchingNextPage: false, refetch: vi.fn(), fetchNextPage: vi.fn() };
});

describe('NotificationsView: the tabs control a real panel (QA A13-005)', () => {
  it('every tab aria-controls an existing tabpanel labelled by the active tab', () => {
    render(<NotificationsView scope="personal" />);
    for (const tab of screen.getAllByRole('tab')) {
      const id = tab.getAttribute('aria-controls');
      expect(id).toBeTruthy();
      const panel = document.getElementById(id as string);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
    }
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-all');
  });
});

describe('NotificationsView', () => {
  it('shows the loading skeleton', () => {
    list = { ...list, isLoading: true, data: undefined };
    render(<NotificationsView scope="personal" />);
    expect(screen.getByLabelText('Loading notifications')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an error with a retry that refetches', async () => {
    list = { ...list, isError: true, data: undefined };
    render(<NotificationsView scope="personal" />);
    expect(screen.getByText('We could not load your notifications.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(list.refetch).toHaveBeenCalled();
  });

  it('empty All tab offers Home and Settings for the scope', () => {
    const { unmount } = render(<NotificationsView scope="personal" />);
    expect(screen.getByText('You are all caught up')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    unmount();
    render(<NotificationsView scope="acme" />);
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/w/acme');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/w/acme/settings');
  });

  it.each([
    ['unread', 'Nothing unread.'],
    ['mentions', 'No mentions yet.'],
  ])('empty %s tab has its own copy and no actions', (tab, title) => {
    search = `tab=${tab}`;
    render(<NotificationsView scope="personal" />);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('falls back to All for an unknown tab and queries with the parsed filter', () => {
    search = 'tab=bogus';
    render(<NotificationsView scope="acme" />);
    expect(useNotificationsSpy).toHaveBeenCalledWith('acme', 'all');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
  });

  it('changing tab writes ?tab=, and All removes it while keeping other params', async () => {
    search = 'tab=unread&x=1';
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Mentions' }));
    expect(replace).toHaveBeenCalledWith('/notifications?tab=mentions&x=1');
    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(replace).toHaveBeenLastCalledWith('/notifications?x=1');
  });

  it('All with no other params goes back to the bare path', async () => {
    search = 'tab=unread';
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('tab', { name: 'All' }));
    expect(replace).toHaveBeenCalledWith('/notifications');
  });

  it('groups notifications under Today and Earlier', () => {
    withItems([note('a'), note('b', { createdAt: '2020-01-01T00:00:00Z' })]);
    render(<NotificationsView scope="personal" />);
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Earlier' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'This week' })).not.toBeInTheDocument();
  });

  it('clicking an unread notification marks it read and navigates to its target', async () => {
    withItems([note('a', { type: 'mention', responseId: 'r1', formId: 'f1' })]);
    render(<NotificationsView scope="acme" />);
    await userEvent.click(screen.getByRole('button', { name: /Title a/ }));
    expect(markReadMutate).toHaveBeenCalledWith('a');
    expect(push).toHaveBeenCalledWith('/forms/f1/inbox?responseId=r1&ws=acme');
  });

  it('an already-read notification is not marked again, and one with no target does not navigate', async () => {
    withItems([note('a', { read: true })]);
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('button', { name: /Title a/ }));
    expect(markReadMutate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('Mark all as read is disabled with nothing unread, and enabled otherwise', () => {
    const { unmount } = render(<NotificationsView scope="personal" />);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    unmount();
    unread = 3;
    render(<NotificationsView scope="personal" />);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeEnabled();
  });

  it('Mark all announces success politely', async () => {
    unread = 2;
    markAllMutate.mockImplementation((_v: unknown, o: { onSuccess: () => void }) => o.onSuccess());
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.getByText('All notifications marked as read.')).toBeInTheDocument();
  });

  it('Mark all toasts when it fails', async () => {
    unread = 2;
    markAllMutate.mockImplementation((_v: unknown, o: { onError: () => void }) => o.onError());
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(mockToast).toHaveBeenCalledWith('Could not mark notifications as read. Please try again.', 'error');
  });

  it('Load more appears only with another page and fetches it', async () => {
    withItems([note('a')], { hasNextPage: true });
    render(<NotificationsView scope="personal" />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(list.fetchNextPage).toHaveBeenCalled();
  });

  it('no Load more on the last page', () => {
    withItems([note('a')]);
    render(<NotificationsView scope="personal" />);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('flattens items from several pages', () => {
    list = { ...list, data: { pages: [{ items: [note('a')] }, { items: [note('b')] }] } };
    render(<NotificationsView scope="personal" />);
    expect(screen.getByText('Title a')).toBeInTheDocument();
    expect(screen.getByText('Title b')).toBeInTheDocument();
  });
});
