import { useState, useEffect, useRef, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import type { FormBranding, FormField, FormPage, FormSettings } from '@/types/form';

// Single source of truth for the PATCH payload shape — the debounced autosave, the
// unmount flush, the publish-click flush, and the leave-guard flush all call this
// instead of each hand-rolling the same field-name mapping.
export function saveFormSnapshot(
  formId: string,
  snap: { fields: FormField[]; formTitle: string; pages: FormPage[]; branding: FormBranding; settings: FormSettings }
) {
  return formsService.updateForm(formId, {
    fields: snap.fields,
    title: snap.formTitle,
    pages: snap.pages,
    branding: snap.branding,
    settings: snap.settings,
  });
}

export function useBuilderAutosave() {
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const pages = useBuilderStore((state) => state.pages);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  const markSaved = useBuilderStore((state) => state.markSaved);

  // ─── Autosave ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dirty || !formId || formId === 'undefined') return;

    const timer = setTimeout(async () => {
      const hasEmptyChoiceOptions = fields.some(
        (f) =>
          !f.deleted &&
          (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') &&
          (!f.options || f.options.length === 0)
      );
      if (hasEmptyChoiceOptions) {
        setSaveState('error');
        return;
      }

      try {
        setSaveState('saving');
        await saveFormSnapshot(formId, { fields, formTitle, pages, branding, settings });
        markSaved();
        setSaveState('saved');
        setSavedAt(new Date());

        // Reset save state back to idle after showing success indicator for 2 seconds
        // idleTimerRef keeps this handle so the unmount cleanup below can cancel it
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          idleTimerRef.current = null;
          setSaveState('idle');
        }, 2000);
      } catch (err) {
        if (isAxiosError(err)) {
          console.error('Autosave failed:', err.response?.status, err.response?.data ?? err.message);
        } else {
          console.error('Autosave failed:', err);
        }
        setSaveState('error');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [dirty, fields, formTitle, pages, formId, branding, settings, markSaved]);

  // Cancel the idle reset timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Use refs to avoid re-binding and firing effect on every stroke
  const saveStateRef = useRef({ dirty, fields, formTitle, pages, formId, branding, settings });
  useEffect(() => {
    saveStateRef.current = { dirty, fields, formTitle, pages, formId, branding, settings };
  }, [dirty, fields, formTitle, pages, formId, branding, settings]);

  // Flush unsaved edits when the tab is hidden or the page is going away (autosave is a 2s debounce, so
  // the last edits would otherwise be lost). Same save path as autosave.
  useEffect(() => {
    const flush = () => {
      const c = saveStateRef.current;
      if (!c.dirty || !c.formId || c.formId === 'undefined') return;
      const hasEmptyChoice = c.fields.some(
        (f) => !f.deleted && (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') && !f.options?.length
      );
      if (hasEmptyChoice) return;
      saveFormSnapshot(c.formId, c).then(() => useBuilderStore.getState().markSaved()).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  // Synchronous flush on unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStateRef.current.dirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      const current = saveStateRef.current;
      if (current.dirty && current.formId && current.formId !== 'undefined') {
        saveFormSnapshot(current.formId, current).catch(() => {});
      }
    };
  }, []);

  // Retry after a failed autosave (SaveIndicator). A failed save leaves `dirty` true, so the leave
  // guard already treats it as unsaved; this just re-runs the same save immediately.
  const handleRetrySave = useCallback(async () => {
    const current = saveStateRef.current;
    if (!current.formId || current.formId === 'undefined') return;
    try {
      setSaveState('saving');
      await saveFormSnapshot(current.formId, current);
      markSaved();
      setSaveState('saved');
      setSavedAt(new Date());
    } catch {
      setSaveState('error');
      toast('Could not save. Please try again.', 'error');
    }
  }, [markSaved, toast]);

  return { saveState, setSaveState, savedAt, handleRetrySave };
}
