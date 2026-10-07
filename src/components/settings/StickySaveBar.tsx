'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Returns [saved, flash]. `flash()` turns `saved` on for a few seconds, then off again. */
export function useSavedFlash(ms = 3000): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const flash = useCallback(() => {
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), ms);
  }, [ms]);
  return [saved, flash];
}

interface StickySaveBarProps {
  dirty: boolean;
  saving: boolean;
  /** True briefly after a successful save (useSavedFlash). */
  saved: boolean;
  onDiscard: () => void;
  /** What was saved, for the resting confirmation: "Workspace settings". */
  subject: string;
}

/**
 * Sticks to the bottom of the scroll area, only while there is something to save (or just was).
 * Must sit inside the <form> — Save is the form's submit button.
 */
export function StickySaveBar({ dirty, saving, saved, onDiscard, subject }: StickySaveBarProps) {
  if (!dirty && !saved) return null;
  return (
    <div
      role="region"
      aria-label="Save changes"
      className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) px-4 py-3 shadow-md"
    >
      {dirty ? (
        <>
          <p className="bg-body-sm text-(--text-secondary)">You have unsaved changes.</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="small" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
            <Button type="submit" size="small" isLoading={saving}>
              Save changes
            </Button>
          </div>
        </>
      ) : (
        <p role="status" className="inline-flex items-center gap-1.5 bg-body-sm text-(--success-text)">
          <Check size={14} aria-hidden="true" />
          Saved. {subject} is up to date.
        </p>
      )}
    </div>
  );
}
