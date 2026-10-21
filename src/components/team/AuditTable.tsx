import { Avatar } from '@/components/ui/Avatar';
import { describeEventAction, displayTargetLabel } from '@/lib/eventLabels';
import { formatResponseDate } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export interface AuditTableProps {
  events: WorkspaceEventItem[];
  isLoading?: boolean;
  /** The actor's profile picture, if there is one; without it (or if it fails to load) their initials are shown. */
  avatarOf?: (event: WorkspaceEventItem) => string | undefined;
}

const SKELETON_ROWS = 5;

// requirements.md §7.7 / design.md §6, §16.3. Hand-rolled <table> in ui/Table's scroll-container
// classes, not the generic `ui/Table` — that always applies .bg-table-stack (row-to-card below
// 640px), and a security record must keep its column alignment (RolesMatrix's Sprint 9 precedent).
// Action and target read as one sentence ("downloaded a csv report"), so they share a column; the
// actor cell is the row header so the row is announced by who did it. The origin hash is not
// human-readable, so it is not shown at all.
export function AuditTable({ events, isLoading, avatarOf }: AuditTableProps) {
  return (
    <div className="bg-table-wrap">
      <table className="bg-table">
        <thead>
          <tr>
            <th scope="col">Actor</th>
            <th scope="col">Event</th>
            <th scope="col" className="text-right">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {[0, 1, 2].map((col) => (
                    <td key={col}>
                      <span className="bg-skeleton bg-skeleton-text" />
                    </td>
                  ))}
                </tr>
              ))
            : events.map((event, i) => (
                <tr key={event.id}>
                  <th
                    scope="row"
                    className="w-1/4 text-left normal-case"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: i === events.length - 1 ? 0 : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className="flex items-center gap-2.5 font-medium text-(--text-primary)">
                      <Avatar name={event.actorName} src={avatarOf?.(event)} alt="" size="sm" aria-hidden="true" className="flex-none" />
                      <span className="truncate">{event.actorName}</span>
                    </span>
                  </th>
                  <td className="text-(--text-secondary)">
                    {describeEventAction(event.action, event.metadata)}{' '}
                    {event.targetLabel && <strong className="font-semibold text-(--text-primary)">{displayTargetLabel(event.targetLabel)}</strong>}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums text-(--text-muted)">{formatResponseDate(event.createdAt)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
