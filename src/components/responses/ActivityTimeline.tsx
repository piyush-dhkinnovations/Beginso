'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  MessageSquare,
  Send,
  Tag as TagIcon,
  UserMinus,
  UserPlus,
  Workflow,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/formatters';
import type { ActivityEntry, ActivityType } from '@/types/activity';

const COLLAPSED_LIMIT = 10;

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
 * read, newest first. Falls back to a generic row + `Workflow` icon for any type this list
 * doesn't recognise, never throws — same non-exhaustive-union precedent as `NotificationBell`.
 * Collapses to the latest 10 with a "Show all" toggle once there's more than that.
 */
export function ActivityTimeline({ entries, isLoading, isError, onRetry }: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false);

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
        <p className="bg-body-sm text-(--text-muted)">Couldn&apos;t load activity.</p>
        {onRetry && (
          <Button variant="secondary" size="small" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return <p className="bg-body-sm text-(--text-muted)">No activity yet.</p>;
  }

  // Defensive newest-first sort — the backend now returns it this way, but a stale cache or a
  // future caller supplying entries in another order shouldn't silently flip the list.
  const sorted = [...entries].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {visible.map((entry) => {
          const Icon = TYPE_ICON[entry.type] ?? Workflow;
          const label = TYPE_LABEL[entry.type] ?? entry.type;
          return (
            <li key={entry.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--bg-subtle) text-(--text-muted)">
                <Icon size={13} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="bg-body-sm text-(--text-primary)">
                  <span className="font-medium">{entry.actorName}</span>
                  {entry.actorRemoved && <span className="text-(--text-muted)"> · no longer has access</span>}
                  {' '}
                  {label.toLowerCase()}
                  {entry.detail ? ` — ${entry.detail}` : ''}
                </p>
                <p className="bg-caption text-(--text-muted)">{formatRelativeTime(entry.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {sorted.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 self-start bg-body-sm font-medium text-(--text-link) hover:underline"
        >
          <ChevronDown size={14} className={expanded ? 'rotate-180' : undefined} aria-hidden="true" />
          {expanded ? 'Show less' : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}
