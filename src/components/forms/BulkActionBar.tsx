'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface BulkActionBarProps {
  count: number;
  isDeleting: boolean;
  onDeleteSelected: () => void;
}

// sprint-10-events-migration, task 6.4. Bulk Archive is deliberately not offered here — there is
// no `'archived'` value in `FormStatus` (src/types/form.ts) today, so there is nothing for it to
// set; requirements §7.11 says omit the action entirely rather than show it disabled for a
// status that doesn't exist. Sequential per-id delete calls (task 6.4's own stated reasoning) —
// no batch-delete endpoint assumed or built.
export function BulkActionBar({ count, isDeleting, onDeleteSelected }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
      style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--border-focus)' }}
      role="status"
    >
      <span className="text-body-sm font-medium" style={{ color: 'var(--accent-soft-text)' }}>
        {count} selected
      </span>
      <div className="ml-auto">
        <Button variant="destructive" size="small" disabled={isDeleting} isLoading={isDeleting} onClick={onDeleteSelected}>
          <Trash2 size={14} className="mr-2" aria-hidden="true" />
          Delete selected
        </Button>
      </div>
    </div>
  );
}
