import { useState, useEffect, useRef, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { flushPendingEdits, hasPendingEdits } from '@/lib/pendingEdits';
import type { FormBranding, FormField, FormPage, FormSettings } from '@/types/form';

// Single source of truth for the PATCH payload shape — the debounced autosave, the
// unmount flush, the publish-click flush, and the leave-guard flush all call this
// instead of each hand-rolling the same field-name mapping.
// Saves go through ONE queue. Each save waits for the previous one and then reads the version the previous one
// returned, so a user's own consecutive saves never conflict with each other (a second save sent while the first
// is in flight would carry the old version and be refused as stale).
let saveQueue: Promise<unknown> = Promise.resolve();

// Under the browser's 64 KiB cap for a keepalive body, with room for the request's own headers.
export const KEEPALIVE_BODY_LIMIT = 60_000;

export const isFormStale = (err: unknown): boolean =>
  isAxiosError(err) && err.response?.status === 409 && (err.response.data as { error?: { code?: string } } | undefined)?.error?.code === 'FORM_STALE';

// No reply at all (network drop, timeout): the server may or may not have applied the save.
const gotNoReply = (err: unknown): boolean => isAxiosError(err) && !err.response;

export function saveFormSnapshot(
  formId: string,
  snap: { fields: FormField[]; formTitle: string; pages: FormPage[]; branding: FormBranding; settings: FormSettings },
  // The page is going away: send with fetch keepalive so the browser finishes the request after the page is gone. A normal XHR is
  // cancelled on unload, which is how an accepted "leave anyway" still lost the edit (QA D3-001).
  opts: { keepalive?: boolean } = {}
) {
  const run = saveQueue.then(async () => {
    const store = useBuilderStore.getState();
    const own = store.formId === formId;
    // Once another tab/person has saved first, nothing more is sent: the next save would overwrite their work.
    if (own && store.stale) throw new Error('This form changed elsewhere; reload before saving.');
    const payload = {
      fields: snap.fields,
      title: snap.formTitle,
      pages: snap.pages,
      branding: snap.branding,
      settings: snap.settings,
      // The same saveId on a retry tells the server "this is the save you may already have applied".
      ...(own && store.contentVersion !== null ? { expectedContentVersion: store.contentVersion, saveId: crypto.randomUUID() } : {}),
    };
    // The extra argument is only passed for the page-closing save, so ordinary saves keep their exact call shape.
    // A browser refuses a keepalive request whose body is over about 64 KiB (the request fails outright). A big form can pass that, so
    // then the page-closing save goes out as an ordinary request instead (best effort: the leave prompt is what protects the edit,
    // because the store stays dirty until a save is confirmed).
    const keepalive = !!opts.keepalive && JSON.stringify(payload).length < KEEPALIVE_BODY_LIMIT;
    const send = () => (keepalive ? formsService.updateForm(formId, payload, { keepalive: true }) : formsService.updateForm(formId, payload));
    try {
      let saved;
      try {
        saved = await send();
      } catch (err) {
        // The reply may have been lost after the server applied the save. Retrying with the SAME version and saveId is
        // safe either way: if it was applied the server recognises the saveId and answers success, if not it applies it.
        if (!gotNoReply(err) || !payload.saveId) throw err;
        saved = await send();
      }
      if (own && typeof saved?.contentVersion === 'number') useBuilderStore.getState().setContentVersion(saved.contentVersion);
      return saved;
    } catch (err) {
      if (own && isFormStale(err)) useBuilderStore.getState().markStale();
      throw err;
    }
  });
  saveQueue = run.catch(() => undefined);
  return run;
}

// Publish, unpublish and close change the form on the server too. Adopt the version they produced (queued behind any
// save in flight), or the next autosave could be refused as if another tab had edited the form.
export function syncBuilderVersion(formId: string) {
  const run = saveQueue.then(async () => {
    try {
      const form = await formsService.getFormById(formId);
      const store = useBuilderStore.getState();
      if (store.formId === formId && typeof form?.contentVersion === 'number' && !store.stale) store.setContentVersion(form.contentVersion);
    } catch {
      // keep the version we have; a real conflict will still be caught by the server
    }
  });
  saveQueue = run;
  return run;
}

// The Reload button must not trip the "you have unsaved changes" prompt: the user has already been told.
let reloadRequested = false;
export function reloadBuilder() {
  reloadRequested = true;
  window.location.reload();
}

// The server's own reason for a rejected save ("Option value cannot be empty"), not just "Save failed".
export function saveErrorDetail(err: unknown): string | null {
  if (!isAxiosError(err)) return null;
  // No reply at all: offline, or Beginso cannot be reached. Say so instead of a bare "Save failed" (QA D3-002).
  if (!err.response) return "Can't reach Beginso. Check your connection";
  const status = err.response.status;
  const data = err.response.data as { errors?: { message?: string }[]; message?: string; error?: { message?: string } } | undefined;
  const detail = data?.errors?.find((e) => e?.message)?.message ?? (status < 500 ? (data?.error?.message ?? data?.message) : undefined);
  if (detail) return detail;
  if (status === 401 || status === 403) return 'You no longer have access to this form. Sign in again';
  if (status === 413) return 'This form is too large to save';
  if (status === 429) return 'Too many saves at once. Wait a moment and retry';
  if (status >= 500) return `Beginso had a problem saving (error ${status})`;
  return null;
}

// The form as it is in the store right now (not the render-time copy), for saves that run while the page is going away.
const freshState = () => {
  const s = useBuilderStore.getState();
  return { dirty: s.dirty, fields: s.fields, formTitle: s.formTitle, pages: s.pages, formId: s.formId, branding: s.branding, settings: s.settings };
};

export function useBuilderAutosave() {
  const { toast } = useToast();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveDetail, setSaveDetail] = useState<string | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formId = useBuilderStore((state) => state.formId);
  const formTitle = useBuilderStore((state) => state.formTitle);
  const fields = useBuilderStore((state) => state.fields);
  const pages = useBuilderStore((state) => state.pages);
  const dirty = useBuilderStore((state) => state.dirty);
  const branding = useBuilderStore((state) => state.branding);
  const settings = useBuilderStore((state) => state.settings);
  const markSaved = useBuilderStore((state) => state.markSaved);
  const stale = useBuilderStore((state) => state.stale);

  // ─── Autosave ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!dirty || !formId || formId === 'undefined' || stale) return;

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
        setSaveDetail(null);
        setSavedAt(new Date());

        // Reset save state back to idle after showing success indicator for 2 seconds
        // idleTimerRef keeps this handle so the unmount cleanup below can cancel it
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
          idleTimerRef.current = null;
          setSaveState('idle');
        }, 2000);
      } catch (err) {
        // A stale save is not a failure to retry: the header switches to the reload message instead.
        if (isFormStale(err)) {
          setSaveState('idle');
          return;
        }
        if (isAxiosError(err)) {
          console.error('Autosave failed:', err.response?.status, err.response?.data ?? err.message);
        } else {
          console.error('Autosave failed:', err);
        }
        setSaveDetail(saveErrorDetail(err));
        setSaveState('error');
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [dirty, fields, formTitle, pages, formId, branding, settings, markSaved, stale]);

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
      // First commit anything typed in the last moments (a debounced input has not reached the store yet), THEN read the store:
      // the ref above only catches up after a render, which does not happen while the page is closing.
      flushPendingEdits();
      const c = freshState();
      if (!c.dirty || !c.formId || c.formId === 'undefined') return;
      const hasEmptyChoice = c.fields.some(
        (f) => !f.deleted && (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') && !f.options?.length
      );
      if (hasEmptyChoice) return;
      saveFormSnapshot(c.formId, c, { keepalive: true }).then(() => useBuilderStore.getState().markSaved()).catch(() => {});
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
      // Typed-but-uncommitted text counts: the store is not dirty until the debounce fires.
      if ((useBuilderStore.getState().dirty || hasPendingEdits()) && !reloadRequested) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      flushPendingEdits();
      const current = freshState();
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
      setSaveDetail(null);
      setSavedAt(new Date());
    } catch (err) {
      const detail = saveErrorDetail(err);
      setSaveDetail(detail);
      setSaveState('error');
      toast(detail ? `Could not save: ${detail}` : 'Could not save. Please try again.', 'error');
    }
  }, [markSaved, toast]);

  return { saveState, setSaveState, savedAt, saveDetail, handleRetrySave };
}
