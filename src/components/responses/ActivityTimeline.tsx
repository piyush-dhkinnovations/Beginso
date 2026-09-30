'use client';

import {
  CheckCircle2,
  Eye,
  MessageSquare,
  Send,
  Tag as TagIcon,
  UserMinus,
  UserPlus,
  Workflow,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/formatters';
import type { ActivityEntry, ActivityType } from '@/types/activity';

const TYPE_ICON: Partial<Record<string, typeof Workflow>> = {
  submitted: Send,
  opened: Eye,
  stage_changed: Workflow,
  status_change: Workflow,
  assigned: UserPlus,
  unassigned: UserMinus,
  tag_added: TagIcon,
  tag_removed: TagIcon,
  note_added: MessageSquare,
  scored: CheckCircle2,
};

const TYPE_LABEL: Partial<Record<ActivityType, string>> = {
  submitted: 'Submitted',
  opened: 'Opened',
  stage_changed: 'Stage changed',
  status_change: 'Status changed',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  tag_added: 'Tag added',
  tag_removed: 'Tag removed',
  note_added: 'Note added',
  scored: 'Scored',
};

export interface ActivityTimelineProps {
  entries: ActivityEntry[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

/**
 * Sprint 12 (inbox-collaboration), design.md §6/§7/§11.2: renders the response's own activity
 * read (oldest first). Falls back to a generic row + `Workflow` icon for any type this list
 * doesn't recognise, never throws — same non-exhaustive-union precedent as `NotificationBell`.
 */
export function ActivityTimeline({ entries, isLoading, isError, onRetry }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="70%" />
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p className="text-body-sm text-(--text-muted)">Couldn&apos;t load activity.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="bg-btn bg-btn-secondary bg-btn-sm">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return <p className="text-body-sm text-(--text-muted)">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => {
        const Icon = TYPE_ICON[entry.type] ?? Workflow;
        const label = TYPE_LABEL[entry.type] ?? entry.type;
        return (
          <li key={entry.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--bg-subtle) text-(--text-muted)">
              <Icon size={13} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-(--text-primary)">
                <span className="font-medium">{entry.actorName}</span>
                {entry.actorRemoved && <span className="text-(--text-muted)"> · no longer has access</span>}
                {' '}
                {label.toLowerCase()}
                {entry.detail ? ` — ${entry.detail}` : ''}
              </p>
              <p className="text-caption text-(--text-muted)">{formatRelativeTime(entry.at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
