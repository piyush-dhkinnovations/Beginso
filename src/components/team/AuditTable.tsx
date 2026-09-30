import { describeEventAction, displayTargetLabel } from '@/lib/eventLabels';
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
              Origin
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
            : events.map((event, i) => (
                <tr key={event.id}>
                  <th
                    scope="row"
                    className="font-medium text-left normal-case text-(--text-secondary)"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: i === events.length - 1 ? 0 : '1px solid var(--border-subtle)',
                    }}
                  >
                    {event.actorName}
                  </th>
                  <td>{describeEventAction(event.action)}</td>
                  <td className={SECONDARY}>{displayTargetLabel(event.targetLabel)}</td>
                  {/* "Origin", not "IP" — this is a one-way hash (design.md's own "ipHash only,
                      never a raw address" rule), too long to read as a real IP and not one. Only
                      truncate genuinely long hash-length values — a real, short IP (however
                      unlikely to appear given the hashing contract) stays fully visible, same as
                      before. */}
                  <td className={SECONDARY} title={event.ip && event.ip.length > 20 ? event.ip : undefined}>
                    {event.ip ? (event.ip.length > 20 ? `${event.ip.slice(0, 10)}…` : event.ip) : '—'}
                  </td>
                  <td>{formatResponseDate(event.createdAt)}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
