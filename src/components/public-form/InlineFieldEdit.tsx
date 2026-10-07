'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

// Sprint 13 (D1.2a), wireframe 37 "Inline Field Edit". One answer on the review screen becomes its
// real input in place — highlighted card, the field's own label above its input, Cancel / Save
// answer. The respondent never leaves the review screen. The field itself is rendered by the shell
// (so validation is the form's existing per-page resolver, not a second system); this only frames it.
export interface InlineFieldEditProps {
  /** The rendered field renderer (it draws its own label). */
  children: ReactNode;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function InlineFieldEdit({ children, onSave, onCancel, isSaving }: InlineFieldEditProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Focus moves into the input when the editor opens.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('input:not([tabindex="-1"]), textarea, select, button')?.focus();
  }, []);

  return (
    <div
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="rounded-lg border-2 border-(--border-focus) bg-(--surface-card) p-4 flex flex-col gap-3"
    >
      {children}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="small" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" size="small" onClick={onSave} isLoading={isSaving}>
          Save answer
        </Button>
      </div>
    </div>
  );
}
