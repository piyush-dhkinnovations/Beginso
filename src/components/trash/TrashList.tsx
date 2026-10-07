'use client';

import { FileText, Inbox, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TrashItem } from '@/types/trash';
import { RetentionBadge } from './RetentionBadge';

// Sprint 13 (CF5.5), wireframe 41. A dumb list — the page owns every mutation. Row controls render the
// SERVER's `canRestore` / `canPurge`; roles are never re-derived here.
export interface TrashListProps {
  items: TrashItem[];
  pendingId: string | null;
  onRestore: (item: TrashItem) => void;
  onDeleteNow: (item: TrashItem) => void;
}

function meta(item: TrashItem): string {
  const who = item.deletedBy?.name ? `deleted by ${item.deletedBy.name}` : 'deleted';
  if (item.type === 'form') {
    const n = item.responseCount ?? 0;
    return `Form · ${n} ${n === 1 ? 'response' : 'responses'} · ${who}`;
  }
  return `Response${item.formTitle ? ` · ${item.formTitle}` : ''} · ${who}`;
}

export function TrashList({ items, pendingId, onRestore, onDeleteNow }: TrashListProps) {
  return (
    <Card padded={false}>
      <ul className="divide-y divide-(--border-subtle)">
        {items.map((item) => {
          const busy = pendingId === item.id;
          const Icon = item.type === 'form' ? FileText : Inbox;
          return (
            <li
              key={`${item.type}-${item.id}`}
              aria-busy={busy}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
            >
              <Icon size={18} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate bg-body font-semibold text-(--text-primary)">{item.name}</p>
                <p className="bg-caption text-(--text-muted)">{meta(item)}</p>
              </div>
              <RetentionBadge daysLeft={item.daysLeft} />
              <div className="flex gap-2">
                {item.canRestore && (
                  <Button type="button" variant="secondary" size="small" className="min-h-11" onClick={() => onRestore(item)} disabled={busy}>
                    <RotateCcw size={14} className="mr-1.5" aria-hidden="true" />
                    Restore
                  </Button>
                )}
                {item.canPurge && (
                  <Button type="button" variant="destructive" size="small" className="min-h-11" onClick={() => onDeleteNow(item)} disabled={busy}>
                    Delete now
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
