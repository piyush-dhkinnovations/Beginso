import { History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeEventAction } from '@/lib/eventLabels';
import { formatRelativeTime } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export const FORM_ACTIVITY_PREVIEW_COUNT = 5;

// Semantic list, shared by the card and the "View all" drawer.
export function FormEventRows({ events }: { events: WorkspaceEventItem[] }) {
  return (
    <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-baseline justify-between gap-3 py-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="bg-body-sm min-w-0">
            <strong>{event.actorName}</strong> {describeEventAction(event.action, event.metadata)}{' '}
            {event.targetType === 'form' ? 'this form' : event.targetLabel}
          </span>
          <time className="bg-caption shrink-0" dateTime={event.createdAt}>
            {formatRelativeTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export interface FormActivityCardProps {
  events: WorkspaceEventItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewAll: () => void;
}

// requirements.md §7.5 / design.md §6, §17. Presentational. `events` is expected to hold up to
// PREVIEW_COUNT + 1 rows: the extra one is how this card knows "View all" is warranted without a
// total from the backend (the events contract returns a bare array).
export function FormActivityCard({ events, isLoading, isError, onRetry, onViewAll }: FormActivityCardProps) {
  const preview = (events ?? []).slice(0, FORM_ACTIVITY_PREVIEW_COUNT);
  const hasMore = (events?.length ?? 0) > FORM_ACTIVITY_PREVIEW_COUNT;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="bg-h4">Form activity</h2>

      {isLoading ? (
        <div className="flex flex-col gap-2" aria-label="Loading activity">
          {Array.from({ length: FORM_ACTIVITY_PREVIEW_COUNT }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={16} />
          ))}
        </div>
      ) : isError ? (
        <Alert variant="error" title="Could not load activity.">
          <Button variant="secondary" size="small" onClick={onRetry}>
            Retry
          </Button>
        </Alert>
      ) : preview.length === 0 ? (
        // A true zero-items state (a new form has no history) — not an error (requirements §7.5).
        <EmptyState
          icon={<History className="bg-icon" aria-hidden="true" />}
          title="Nothing has happened here yet."
          description="Activity on this form — publishing, sharing, edits — will show up here."
        />
      ) : (
        <>
          <FormEventRows events={preview} />
          {hasMore && (
            <Button variant="ghost" size="small" className="self-start" onClick={onViewAll}>
              View all
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
