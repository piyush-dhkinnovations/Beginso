'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { NotificationRow } from './NotificationRow';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useWorkspaceTimezone } from '@/hooks/useWorkspaceTimezone';
import { groupNotifications } from '@/lib/notificationGroups';
import { resolveNotificationTarget } from '@/lib/notificationTarget';
import type { AppNotification, NotificationFilter } from '@/types/notification';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'mentions', label: 'Mentions' },
];

// design.md §14: `tab` is validated against the allowed set; anything else falls back to All.
function parseTab(raw: string | null): NotificationFilter {
  return raw === 'unread' || raw === 'mentions' ? raw : 'all';
}

const EMPTY_COPY: Record<NotificationFilter, { title: string; description: string }> = {
  all: { title: 'You are all caught up', description: 'New submissions, team activity, and system alerts will show up here.' },
  unread: { title: 'Nothing unread.', description: 'New notifications will appear here until you read them.' },
  mentions: { title: 'No mentions yet.', description: 'Mentions of you in notes appear here.' },
};

interface NotificationsViewProps {
  /** 'personal' or a workspace slug. */
  scope: string;
}

// Sprint 14 (B9.1-B9.3, requirements 3.1/3.3/3.4, task 3.13). Wireframe 19: header with Mark all as
// read, tabs, Today / This week / Earlier cards. All / Unread / Mentions per the feature list (the
// wireframe's Responses / Team / System filters are deliberately not built - design.md §15).
export function NotificationsView({ scope }: NotificationsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = parseTab(searchParams.get('tab'));
  const timeZone = useWorkspaceTimezone(scope);
  const [announcement, setAnnouncement] = useState('');
  const { toast } = useToast();

  const listQuery = useNotifications(scope, filter);
  const { data: unreadCount = 0 } = useUnreadCount(scope);
  const { markAllRead, markRead } = useNotificationActions(scope);

  const items = useMemo(() => listQuery.data?.pages.flatMap((p) => p.items) ?? [], [listQuery.data]);
  const groups = useMemo(() => groupNotifications(items, timeZone), [items, timeZone]);

  function changeTab(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'all') params.delete('tab');
    else params.set('tab', id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSelect(notification: AppNotification) {
    if (!notification.read) markRead.mutate(notification.id);
    const target = resolveNotificationTarget(notification, scope);
    if (target) router.push(target);
  }

  function handleMarkAll() {
    markAllRead.mutate(undefined, {
      onSuccess: () => setAnnouncement('All notifications marked as read.'),
      // The optimistic change was already rolled back by the hook; tell the user (design.md §17 "Mutation").
      onError: () => toast('Could not mark notifications as read. Please try again.', 'error'),
    });
  }

  const home = scope === 'personal' ? '/dashboard' : `/w/${scope}`;
  const settings = scope === 'personal' ? '/settings' : `/w/${scope}/settings`;
  const empty = EMPTY_COPY[filter];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Notifications"
        description={scope === 'personal' ? 'Everything happening across your forms.' : 'Everything happening across your workspace.'}
        actionsAlign="center"
        actions={
          <Button variant="ghost" onClick={handleMarkAll} isLoading={markAllRead.isPending} disabled={unreadCount === 0}>
            Mark all as read
          </Button>
        }
      />
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>

      <Tabs tabs={TABS} activeId={filter} onChange={changeTab} ariaLabel="Notification filters" />

      {listQuery.isLoading ? (
        <Card padded={false} aria-busy="true" aria-label="Loading notifications">
          <ul className="divide-y divide-(--border-default)">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex animate-pulse items-start gap-3 px-5 py-3">
                <span className="h-8 w-8 shrink-0 rounded-full bg-(--bg-sunken)" />
                <span className="flex flex-1 flex-col gap-1.5">
                  <span className="h-3.5 w-1/3 rounded bg-(--border-default)" />
                  <span className="h-3 w-2/3 rounded bg-(--bg-sunken)" />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : listQuery.isError ? (
        <EmptyState
          illustration="error"
          icon={<AlertCircle />}
          title="We could not load your notifications."
          actions={<Button onClick={() => void listQuery.refetch()}>Try again</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          illustration="notifications"
          icon={<Bell />}
          title={empty.title}
          description={empty.description}
          actions={
            filter === 'all' ? (
              <>
                <Link href={home}><Button variant="primary">Go to Home</Button></Link>
                <Link href={settings}><Button variant="secondary">Settings</Button></Link>
              </>
            ) : undefined
          }
        />
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`notif-group-${group.label}`} className="flex flex-col gap-2">
              <h2 id={`notif-group-${group.label}`} className="bg-overline text-(--text-muted)">{group.label}</h2>
              <Card padded={false} className="overflow-hidden">
                <ul className="divide-y divide-(--border-default)">
                  {group.items.map((n) => (
                    <NotificationRow key={n.id} notification={n} onSelect={handleSelect} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          {listQuery.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => void listQuery.fetchNextPage()} isLoading={listQuery.isFetchingNextPage}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
