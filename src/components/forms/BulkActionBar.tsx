'use client';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface BulkActionBarProps {
  count: number;
  isDeleting: boolean;
  onDeleteSelected: () => void;
  /** Archive (or Unarchive on the Archived tab). Omitted for roles that cannot archive. */
  onArchiveSelected?: () => void;
  isArchiving?: boolean;
  archiveLabel?: 'Archive' | 'Unarchive';
}

// Sequential per-id calls — no batch
// endpoint assumed or built. Archive is offered only when the
// caller can archive; Delete means "move to Trash".
export function BulkActionBar({
  count,
  isDeleting,
  onDeleteSelected,
  onArchiveSelected,
  isArchiving = false,
  archiveLabel = 'Archive',
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
      style={{ backgroundColor: 'var(--accent-soft)', border: '1px solid var(--border-focus)' }}
      role="status"
    >
      <span className="bg-body-sm font-medium" style={{ color: 'var(--accent-soft-text)' }}>
        {count} selected
      </span>
      <div className="ml-auto flex items-center gap-2">
        {onArchiveSelected && (
          <Button variant="secondary" size="small" disabled={isArchiving || isDeleting} isLoading={isArchiving} onClick={onArchiveSelected}>
            {archiveLabel === 'Archive' ? (
              <Archive size={14} className="mr-2" aria-hidden="true" />
            ) : (
              <ArchiveRestore size={14} className="mr-2" aria-hidden="true" />
            )}
            {archiveLabel} selected
          </Button>
        )}
        <Button variant="destructive" size="small" disabled={isDeleting} isLoading={isDeleting} onClick={onDeleteSelected}>
          <Trash2 size={14} className="mr-2" aria-hidden="true" />
          Delete selected
        </Button>
      </div>
    </div>
  );
}
