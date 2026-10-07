import Link from 'next/link';
import { Download, FileText, History, Inbox, LayoutTemplate, Settings, Shield, Users, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { describeEventAction, displayTargetLabel } from '@/lib/eventLabels';
import { formatRelativeTime } from '@/lib/formatters';
import type { WorkspaceEventItem } from '@/types/event';

export type ActivityCategory = 'forms' | 'responses' | 'access' | 'workspace';

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  forms: 'Forms',
  responses: 'Responses',
  access: 'Members & access',
  workspace: 'Workspace',
};

// One mapping from the backend's free-form `action` to a display category + icon. Unknown actions land
// in "workspace" with a neutral icon — shown, never hidden (same stance as eventLabels).
export function categoryOf(action: string): ActivityCategory {
  if (action.startsWith('response.') || action.startsWith('export.') || action.startsWith('report.')) return 'responses';
  if (action.startsWith('access.') || action.startsWith('member.') || action.startsWith('session.')) return 'access';
  if (action.startsWith('form.') || action.startsWith('template.')) return 'forms';
  return 'workspace';
}

function iconOf(action: string): LucideIcon {
  if (action.startsWith('export.') || action.startsWith('report.')) return Download;
  if (action.startsWith('response.')) return Inbox;
  if (action.startsWith('session.')) return Shield;
  if (action.startsWith('access.') || action.startsWith('member.')) return Users;
  if (action.startsWith('template.')) return LayoutTemplate;
  if (action.startsWith('form.')) return FileText;
  if (action.startsWith('workspace')) return Settings;
  return History;
}

const GONE = /(deleted|purge|remove|trash)/;

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: diff > 300 ? 'numeric' : undefined });
}

interface Row {
  event: WorkspaceEventItem;
  /** How many identical consecutive events this row stands for. */
  count: number;
}

// Newest-first input. Consecutive events with the same actor, action and target are one row ("×40"):
// forty "workspace update" lines in a row are one thing that happened repeatedly, not forty things.
function collapse(events: WorkspaceEventItem[]): Row[] {
  const rows: Row[] = [];
  for (const event of events) {
    const last = rows[rows.length - 1];
    if (last && last.event.actorName === event.actorName && last.event.action === event.action && last.event.targetLabel === event.targetLabel) {
      last.count += 1;
    } else {
      rows.push({ event, count: 1 });
    }
  }
  return rows;
}

export interface ActivityFeedProps {
  events: WorkspaceEventItem[];
  /** Shown instead of the default empty state when a filter, not the workspace, is why the list is empty. */
  emptyTitle?: string;
  emptyDescription?: string;
}

// requirements.md §7.6 / design.md §6. Grouped by day, avatar + category icon per row, repeats collapsed,
// form targets link to the form. `targetLabel` is a snapshot taken at event time (design.md §11.2), so a
// renamed or deleted form still reads correctly here.
export function ActivityFeed({ events, emptyTitle, emptyDescription }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <EmptyState illustration="team"
        icon={<History className="bg-icon" aria-hidden="true" />}
        title={emptyTitle ?? 'Nothing has happened yet.'}
        description={emptyDescription ?? 'Activity across your workspace — forms, members, access — will show up here.'}
      />
    );
  }

  const groups: { label: string; rows: Row[] }[] = [];
  for (const row of collapse(events)) {
    const label = dayLabel(row.event.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.rows.push(row);
    else groups.push({ label, rows: [row] });
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="bg-caption font-semibold uppercase tracking-wide text-(--text-muted) mb-2">{group.label}</h2>
          <ul className="flex flex-col overflow-hidden rounded-lg border border-(--border-default) bg-(--surface-card)" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {group.rows.map(({ event, count }) => {
              const Icon = iconOf(event.action);
              const target = displayTargetLabel(event.targetLabel);
              const linkable = event.targetType === 'form' && event.targetId && !GONE.test(event.action);
              return (
                <li key={event.id} className="flex items-center gap-3 px-4 py-3 border-b border-(--border-subtle) last:border-b-0 hover:bg-(--surface-hover)">
                  <div className="relative shrink-0">
                    <Avatar name={event.actorName} size="sm" />
                    <span className="absolute -bottom-1 -right-1 flex size-4.5 items-center justify-center rounded-full border border-(--border-default) bg-(--surface-card) text-(--text-muted)" aria-hidden="true">
                      <Icon size={10} />
                    </span>
                  </div>
                  <span className="bg-body min-w-0 flex-1 text-(--text-secondary)">
                    <strong className="text-(--text-primary)">{event.actorName}</strong> {describeEventAction(event.action, event.metadata)}{' '}
                    {linkable ? (
                      <Link href={`/forms/${event.targetId}/overview`} className="font-medium text-(--text-primary) underline decoration-(--border-strong) underline-offset-2 hover:decoration-current">
                        {target}
                      </Link>
                    ) : (
                      <span className="font-medium text-(--text-primary)">{target}</span>
                    )}
                    {count > 1 && (
                      <span className="ml-2 rounded-full bg-(--bg-sunken) px-2 py-0.5 bg-caption font-semibold text-(--text-muted)" title={`${count} times in a row`}>
                        ×{count}
                      </span>
                    )}
                  </span>
                  <time className="bg-caption shrink-0 text-(--text-muted)" dateTime={event.createdAt}>
                    {formatRelativeTime(event.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
