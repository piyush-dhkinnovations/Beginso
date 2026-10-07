'use client';

import { StateArt } from '@/components/illustrations/Illustration';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { resolveNotificationTarget } from '@/lib/notificationTarget';
import type { AppNotification } from '@/types/notification';

// The bell is the quick view (latest 10); the full history lives on the Notifications page.
const BELL_LIMIT = 10;

export interface NotificationBellProps {
  /** 'personal' (default) or the active workspace slug - the badge and list are per context (B9.3). */
  scope?: string;
}

// Mirrors UserProfileDropdown's exact self-contained open/close + outside-click/Escape pattern,
// right next to it in TopNav. Sprint 14 (B9.1/B9.2): the badge reads the shared unread-count query
// (polled every 45 s on a visible tab); the list is fetched only while the dropdown is open.
export function NotificationBell({ scope = 'personal' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: unreadCount = 0 } = useUnreadCount(scope);
  const listQuery = useNotifications(scope, 'all', { limit: BELL_LIMIT, enabled: isOpen });
  const { markRead } = useNotificationActions(scope);
  const notifications = listQuery.data?.pages[0]?.items ?? [];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Routing is the shared helper the Notifications page also uses (task 1.4).
  function handleItemClick(notification: AppNotification) {
    if (!notification.read) markRead.mutate(notification.id);
    setIsOpen(false);
    const target = resolveNotificationTarget(notification, scope);
    if (target) router.push(target);
  }

  const viewAllHref = scope === 'personal' ? '/notifications' : `/w/${scope}/notifications`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) transition-colors focus:outline-none focus:ring-2 focus:ring-(--border-focus)/20"
        aria-label={unreadCount > 0 ? `View notifications, ${unreadCount} unread` : 'View notifications'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-(--action-primary)"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 rounded-md border border-(--border-default) shadow-(--shadow-lg) bg-(--surface-card) focus:outline-none z-50 animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-(--border-default)">
            <p className="bg-body-sm font-semibold text-(--text-primary)">Notifications</p>
          </div>

          {listQuery.isLoading ? (
            <ul className="divide-y divide-(--border-default)" aria-busy="true" aria-label="Loading notifications">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex animate-pulse items-start gap-3 px-4 py-3">
                  <span className="h-8 w-8 shrink-0 rounded-full bg-(--bg-sunken)" />
                  <span className="flex flex-1 flex-col gap-1.5">
                    <span className="h-3.5 w-2/3 rounded bg-(--border-default)" />
                    <span className="h-3 w-1/2 rounded bg-(--bg-sunken)" />
                  </span>
                </li>
              ))}
            </ul>
          ) : listQuery.isError ? (
            <div role="alert" className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <p className="bg-body-sm text-(--text-muted)">We could not load your notifications.</p>
              <button type="button" onClick={() => void listQuery.refetch()} className="bg-body-sm font-semibold text-(--action-primary) hover:underline">
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <StateArt name="notifications" size="sm" />
              <p className="bg-body-sm text-(--text-muted)">No notifications yet.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-(--border-default)">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onSelect={handleItemClick} compact />
              ))}
            </ul>
          )}

          <div className="border-t border-(--border-default) px-4 py-2.5 text-center">
            <Link
              href={viewAllHref}
              onClick={() => setIsOpen(false)}
              className="bg-body-sm font-semibold text-(--action-primary) hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
