'use client';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { StageRef } from '@/types/stage';

interface BulkActionBarProps {
  count: number;
  stages: readonly StageRef[];
  onChangeStage: (stageId: string) => void;
  onDeleteSelected: () => void;
  isLoading: boolean;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.5 (5.1): "Bulk bar appears when ≥ 1 row is
 * selected: count · Change stage · ... · Delete · Clear." The old two hardcoded "Mark as In
 * Progress"/"Mark as Completed" buttons are replaced with a stage picker sourced from workspace
 * data — task 1.1's own gate ("Every place that rendered status now renders the stage's name ...
 * from data"). One request per selected stage change (still sequential via `runSequentially` this
 * phase — the batched `POST /api/responses/bulk` endpoint and Undo are task 2.3/BE 0.2). Tag/assign/
 * mark-read actions and the mobile `ui/Menu` overflow are Phase 2 (task 2.4).
 */
export function BulkActionBar({ count, stages, onChangeStage, onDeleteSelected, isLoading }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex items-center gap-3 px-4 py-2 bg-(--accent-soft) border border-(--border-default) rounded-lg mb-2"
    >
      <span className="text-body-sm font-medium text-(--accent-soft-text)" aria-live="polite">
        {count} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {stages.length > 0 && (
          <Select
            id="bulk-change-stage"
            aria-label="Change stage for selected responses"
            disabled={isLoading}
            value=""
            onChange={(e) => {
              if (e.target.value) onChangeStage(e.target.value);
            }}
          >
            <option value="" disabled>Change stage…</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        )}
        <Button variant="destructive" size="small" disabled={isLoading} onClick={onDeleteSelected}>
          {isLoading ? <LoadingSpinner variant="inline" className="mr-2" /> : null}
          Delete selected
        </Button>
      </div>
    </div>
  );
}
