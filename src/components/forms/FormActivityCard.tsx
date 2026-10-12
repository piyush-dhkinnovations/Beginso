import { useState } from 'react';
import { History } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { describeEventAction } from '@/lib/eventLabels';
import { formatRelativeTime } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export const FORM_ACTIVITY_PREVIEW_COUNT = 5;
// How many recent events the page fetches so the filter below has something to filter.
export const FORM_ACTIVITY_FETCH_COUNT = 50;

const FILTERS = {
  all: { label: 'All activity', test: () => true },
  publishing: { label: 'Publishing', test: (a: string) => /^form\.(publish|unpublish|close|regenerate_link)/.test(a) },
  sharing: { label: 'Sharing & access', test: (a: string) => /^(access|access_grant|invitation)[._]/.test(a) },
  responses: { label: 'Responses', test: (a: string) => a.startsWith('response.') },
  edits: { label: 'Edits', test: (a: string) => /^form\.(create|settings_changed|duplicate|move|archive|unarchive|trash|restore)/.test(a) },
} as const;
type FilterKey = keyof typeof FILTERS;

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
  const [filter, setFilter] = useState<FilterKey>('all');
  const filtered = (events ?? []).filter((e) => FILTERS[filter].test(e.action));
  const preview = filtered.slice(0, FORM_ACTIVITY_PREVIEW_COUNT);
  const hasMore = filtered.length > FORM_ACTIVITY_PREVIEW_COUNT;

  return (
    <section aria-labelledby="form-activity-heading" className="flex flex-col gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-5">
      <div className="flex items-center justify-between gap-3 border-b border-(--border-default) pb-3">
        <h2 id="form-activity-heading" className="bg-h4">Form activity</h2>
        <div className="w-44">
          <Select id="form-activity-filter" aria-label="Filter activity" value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)}>
            {Object.entries(FILTERS).map(([key, f]) => (
              <option key={key} value={key}>{f.label}</option>
            ))}
          </Select>
        </div>
      </div>

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
          title={filter === 'all' ? 'Nothing has happened here yet.' : 'No matching activity.'}
          description={filter === 'all' ? 'Activity on this form — publishing, sharing, edits — will show up here.' : 'Try a different filter.'}
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
    </section>
  );
}
