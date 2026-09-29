'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AtSign, Bell, FileText, KeyRound, PartyPopper, UserPlus } from 'lucide-react';
import { notificationsService } from '@/services/notifications';
import { notificationKeys } from '@/lib/queryKeys';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notification';

// Sprint 12 (inbox-collaboration), requirements.md §7.12: "the bell renders mention and
// assignment notifications without crashing on new type values ... an unknown type falls back to
// a generic row." `NotificationType` widened to a non-exhaustive string, so this is a lookup with
// a `Bell` fallback rather than a `Record` a new/unrecognised value could no longer fully key.
const TYPE_ICON: Partial<Record<string, typeof Bell>> = {
  welcome: PartyPopper,
  password_reset: KeyRound,
  form_activity: FileText,
  mention: AtSign,
  assignment: UserPlus,
};

// Mirrors UserProfileDropdown's exact self-contained open/close + outside-click/Escape pattern,
// right next to it in TopNav. Backend confirmed live 18 Aug 2026 — see
// docs/backend-contract/api-reference.md §6.
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationsService.getNotifications,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.list() }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  function handleItemClick(notification: AppNotification) {
    if (!notification.read) markAsReadMutation.mutate(notification.id);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text-primary) transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-label="View notifications"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md shadow-lg bg-(--surface-card) ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-(--border-default)">
            <p className="text-body-sm font-semibold text-(--text-primary)">Notifications</p>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-body-sm text-(--text-muted)">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-(--border-default)">
              {notifications.map((notification) => {
                const Icon = TYPE_ICON[notification.type] ?? Bell;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-(--surface-hover)',
                        !notification.read && 'bg-brand-50/50'
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-body-sm font-semibold text-(--text-primary)">{notification.title}</span>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                          )}
                        </span>
                        <span className="block text-caption text-(--text-muted) mt-0.5">{notification.message}</span>
                        <span className="block text-caption text-(--text-muted) mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
