import { History } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeEventAction, displayTargetLabel } from '@/lib/eventLabels';
import { formatRelativeTime } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export interface ActivityFeedProps {
  events: WorkspaceEventItem[];
}

// requirements.md §7.6 / design.md §6. Presentational, no wireframe (design.md §15.2): actor +
// verb + target + relative time, in a semantic list. `targetLabel` is a snapshot taken at event
// time (design.md §11.2), so a renamed or deleted form still reads correctly here.
export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={<History className="bg-icon" aria-hidden="true" />}
        title="Nothing has happened yet."
        description="Activity across your workspace — forms, members, access — will show up here."
      />
    );
  }

  return (
    <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-baseline justify-between gap-3 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="bg-body min-w-0">
            <strong>{event.actorName}</strong> {describeEventAction(event.action)}{' '}
            <span className="font-medium">{displayTargetLabel(event.targetLabel)}</span>
          </span>
          <time className="bg-caption shrink-0" dateTime={event.createdAt}>
            {formatRelativeTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
