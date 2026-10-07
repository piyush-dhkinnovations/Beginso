'use client';

import { ArrowDownUp, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Sprint 13 (CF2.12), requirements.md 4.1 / 4.3. Sticky bar under the canvas below 1024px: Add field
// (opens the bottom sheet) and the Reorder-mode toggle. Reorder mode is explicit because free
// drag-and-drop fights page scroll on touch; per-row Up/Down buttons are the accepted fallback.
export interface MobileBuildBarProps {
  isReordering: boolean;
  canReorder: boolean;
  onAddField: () => void;
  onToggleReorder: () => void;
}

export function MobileBuildBar({ isReordering, canReorder, onAddField, onToggleReorder }: MobileBuildBarProps) {
  return (
    <div className="md:hidden flex shrink-0 gap-3 border-t bg-(--surface-card) p-3 shadow-(--shadow-sm)">
      <Button type="button" className="flex-1" onClick={onAddField} disabled={isReordering}>
        <Plus size={16} aria-hidden="true" /> Add field
      </Button>
      <Button
        type="button"
        variant={isReordering ? 'primary' : 'secondary'}
        className="flex-1"
        onClick={onToggleReorder}
        aria-pressed={isReordering}
        disabled={!canReorder && !isReordering}
      >
        {isReordering ? (
          <>
            <Check size={16} aria-hidden="true" /> Done
          </>
        ) : (
          <>
            <ArrowDownUp size={16} aria-hidden="true" /> Reorder
          </>
        )}
      </Button>
    </div>
  );
}
