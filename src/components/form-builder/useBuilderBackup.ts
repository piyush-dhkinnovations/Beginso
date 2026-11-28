import { useCallback, useEffect, useRef, useState } from 'react';
import { useBuilderStore } from '@/store/builderStore';
import { clearBackup, draftOf, readBackup, writeBackup, type BuilderBackup } from '@/lib/builderBackup';
import { flushPendingEdits } from '@/lib/pendingEdits';
import type { Form } from '@/types/form';

/** How soon after a change the browser copy is rewritten. */
export const BACKUP_DELAY_MS = 300;

/**
 * Keeps this form's unsaved changes in the browser, and brings them back after a reload, a crash or a closed tab.
 * If the form was saved elsewhere since those changes were made, nothing is put back until the person chooses
 * (`conflict`), because saving them would overwrite the newer version.
 */
export function useBuilderBackup(formId: string, userId: string | undefined, formLoaded: boolean) {
  /** When the changes now back in the editor were kept; null when nothing was restored. */
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [conflict, setConflict] = useState<BuilderBackup | null>(null);
  const loadedId = useBuilderStore((state) => state.formId);

  // Once per visit, as soon as the form is on screen.
  const checked = useRef<string | null>(null);
  useEffect(() => {
    // The store is read here, after the form's own loading effect has run, not from this render.
    const state = useBuilderStore.getState();
    if (!userId || !formLoaded || state.formId !== formId || checked.current === formId) return;
    checked.current = formId;
    if (state.dirty) return; // still in the editor from earlier in this visit
    const backup = readBackup(formId, userId);
    if (!backup) return;
    if (JSON.stringify(backup.draft) === JSON.stringify(draftOf(state))) {
      clearBackup(formId); // already saved
    } else if (backup.baseVersion === state.contentVersion && backup.baseDraftSavedAt === state.draftSavedAt) {
      state.restoreDraft(backup.draft);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- known only after reading the browser's copy
      setRestoredAt(backup.savedAt);
    } else {
      setConflict(backup);
    }
  }, [formId, userId, formLoaded, loadedId]);

  // While there are unsaved changes, the copy follows them.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const write = () => {
      const s = useBuilderStore.getState();
      if (s.formId !== formId || !s.dirty) return;
      writeBackup(formId, { userId, savedAt: Date.now(), baseVersion: s.contentVersion, baseDraftSavedAt: s.draftSavedAt, draft: draftOf(s) });
    };
    const unsubscribe = useBuilderStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(write, BACKUP_DELAY_MS);
    });
    // The page is going away: take in anything just typed, and write at once.
    const flush = () => {
      flushPendingEdits();
      write();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [formId, userId]);

  const restoreMine = useCallback(() => {
    if (!conflict) return;
    useBuilderStore.getState().restoreDraft(conflict.draft);
    setRestoredAt(conflict.savedAt);
    setConflict(null);
  }, [conflict]);

  /** Drop the kept changes and show the saved form again. */
  const discard = useCallback(
    (saved: Form | undefined) => {
      useBuilderStore.getState().discardUnsaved();
      clearBackup(formId);
      if (saved) useBuilderStore.getState().initForm(saved);
      setRestoredAt(null);
      setConflict(null);
    },
    [formId]
  );

  return { restoredAt, conflict, restoreMine, discard };
}
