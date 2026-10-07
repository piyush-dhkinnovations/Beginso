'use client';

import { AtSign, Bell, FilePenLine, FileText, KeyRound, PartyPopper, UserPlus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notification';

// Sprint 12 (inbox-collaboration), requirements.md §7.12: an unknown `type` falls back to a generic
// row - a lookup with a `Bell` fallback rather than a Record a new value could no longer fully key.
// Sprint 14 (B9.1): adds `response_edited`. Shared by the bell dropdown and the Notifications page.
const TYPE_ICON: Partial<Record<string, typeof Bell>> = {
  welcome: PartyPopper,
  password_reset: KeyRound,
  form_activity: FileText,
  mention: AtSign,
  assignment: UserPlus,
  response_edited: FilePenLine,
};

interface NotificationRowProps {
  notification: AppNotification;
  onSelect: (notification: AppNotification) => void;
  /** Tighter padding for the bell dropdown. */
  compact?: boolean;
}

export function NotificationRow({ notification, onSelect, compact = false }: NotificationRowProps) {
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className={cn(
          'flex min-h-10 w-full items-start gap-3 text-left transition-colors hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--border-focus)',
          compact ? 'px-4 py-3' : 'px-4 py-3 sm:px-5',
          !notification.read && 'bg-(--accent-soft)/50',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--accent-soft) text-(--accent-soft-text)">
          <Icon size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="bg-body-sm font-semibold text-(--text-primary)">{notification.title}</span>
            {!notification.read && (
              <>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--action-primary)" aria-hidden="true" />
                <span className="sr-only">Unread</span>
              </>
            )}
          </span>
          <span className="mt-0.5 block bg-caption text-(--text-muted)">{notification.message}</span>
          <span className="mt-1 block bg-caption text-(--text-muted)">{formatRelativeTime(notification.createdAt)}</span>
        </span>
      </button>
    </li>
  );
}
