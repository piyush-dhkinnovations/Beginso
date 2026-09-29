'use client';

import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface BulkActionBarProps {
  count: number;
  onMarkInProgress: () => void;
  onMarkCompleted: () => void;
  onDeleteSelected: () => void;
  isLoading: boolean;
  loadingAction?: 'in_progress' | 'completed' | 'delete' | null;
}

export function BulkActionBar({
  count,
  onMarkInProgress,
  onMarkCompleted,
  onDeleteSelected,
  isLoading,
  loadingAction = null,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    // sprint-11-v2a-hardening 5.3: aria-live on the count itself (not the whole bar, which would
    // nest awkwardly with the inline spinner's own role="status") so a change in selection count
    // is announced. The raw bg-brand-*/text-brand-* classes are pre-V2 and stay — that migration is
    // Sprint 11's own accepted-gap register (task 3.4), owned by Sprint 12.
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-50 border border-brand-200 rounded-lg mb-2">
      <span className="text-body-sm font-medium text-brand-700" aria-live="polite">
        {count} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="secondary" size="small" disabled={isLoading} onClick={onMarkInProgress}>
          {loadingAction === 'in_progress' ? <LoadingSpinner variant="inline" className="mr-2" /> : null}
          Mark as In Progress
        </Button>
        <Button variant="secondary" size="small" disabled={isLoading} onClick={onMarkCompleted}>
          {loadingAction === 'completed' ? <LoadingSpinner variant="inline" className="mr-2" /> : null}
          Mark as Completed
        </Button>
        <Button variant="destructive" size="small" disabled={isLoading} onClick={onDeleteSelected}>
          {loadingAction === 'delete' ? <LoadingSpinner variant="inline" className="mr-2" /> : null}
          Delete selected
        </Button>
      </div>
    </div>
  );
}
