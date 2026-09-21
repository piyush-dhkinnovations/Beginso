import { describeEventAction } from '@/lib/eventLabels';
import { formatResponseDate } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export interface AuditTableProps {
  events: WorkspaceEventItem[];
  isLoading?: boolean;
}

const SKELETON_ROWS = 5;

// Target and IP drop out below 640px (wireframe `wf-mobile-hide`); the wrapper scrolls for anything
// still too wide.
const SECONDARY = 'hidden sm:table-cell';

// requirements.md §7.7 / design.md §6, §16.3. Hand-rolled <table> in ui/Table's scroll-container
// classes, not the generic `ui/Table` — that always applies .bg-table-stack (row-to-card below
// 640px), and a security record must keep its column alignment (RolesMatrix's Sprint 9 precedent,
// same reason). The actor cell is a row header so the row is announced by who did it.
export function AuditTable({ events, isLoading }: AuditTableProps) {
  return (
    <div className="bg-table-wrap">
      <table className="bg-table">
        <thead>
          <tr>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col" className={SECONDARY}>
              Target
            </th>
            <th scope="col" className={SECONDARY}>
              IP
            </th>
            <th scope="col">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i} aria-hidden="true">
                  {[true, true, false, false, true].map((always, col) => (
                    <td key={col} className={always ? undefined : SECONDARY}>
                      <span className="bg-skeleton bg-skeleton-text" />
                    </td>
                  ))}
                </tr>
              ))
            : events.map((event) => (
                <tr key={event.id}>
                  <th scope="row" className="font-medium text-left">
                    {event.actorName}
                  </th>
                  <td>{describeEventAction(event.action)}</td>
                  <td className={SECONDARY}>{event.targetLabel}</td>
                  <td className={SECONDARY}>{event.ip || '—'}</td>
                  <td>{formatResponseDate(event.createdAt)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
