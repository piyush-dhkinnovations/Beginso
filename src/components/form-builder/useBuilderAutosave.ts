import { repairPageRefs } from '@/lib/builderPages';
import { useState, useEffect, useRef, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { formsService } from '@/services/forms';
import { cleanTheme } from '@/lib/formTheme';
import { useBuilderStore } from '@/store/builderStore';
import { readAutoSave, useAutoSave } from '@/lib/builderPrefs';
import { clearBackup } from '@/lib/builderBackup';
import { useToast } from '@/components/ui/Toast';
import { flushPendingEdits, hasPendingEdits } from '@/lib/pendingEdits';
import type { FormBranding, FormField, FormPage, FormSettings } from '@/types/form';

// Saving the builder. By default a person saves with the Save button (or Ctrl/Cmd+S); with Auto save on (a setting) the
// form also saves by itself once they stop editing. Publishing and "Save and leave" save first. Until a save succeeds the
// changes are kept in this browser (useBuilderBackup).

/** With Auto save on: how long after the last change the form is saved. */
export const AUTOSAVE_DELAY_MS = 5000;

// Single source of truth for the PATCH payload shape — every kind of save calls this instead of hand-rolling the same
// field-name mapping.
// Saves go through ONE queue. Each save waits for the previous one and then reads the version the previous one
// returned, so a user's own consecutive saves never conflict with each other (a second save sent while the first
// is in flight would carry the old version and be refused as stale).
let saveQueue: Promise<unknown> = Promise.resolve();

// Under the browser's 64 KiB cap for a keepalive body, with room for the request's own headers.
export const KEEPALIVE_BODY_LIMIT = 60_000;

export const isFormStale = (err: unknown): boolean =>
  isAxiosError(err) && err.response?.status === 409 && (err.response.data as { error?: { code?: string } } | undefined)?.error?.code === 'FORM_STALE';

/**
 * The server answered, but its reply has no theme although one was sent: a backend that predates branding.theme drops it without an error. The rest
 * of the form was saved; the style was not. The local value is kept (the reply is never applied over it), the save is reported as failed so the
 * leave prompt still protects it, and the person is told in plain words.
 */
export class ThemeNotSavedError extends Error {
  constructor() {
    super("Couldn't save your style");
    this.name = 'ThemeNotSavedError';
  }
}
export const STYLE_NOT_SAVED = "Couldn't save your style";

/** True when a theme was sent and the server's reply (which has a branding object) does not contain one. */
export const themeWasDropped = (sent: FormBranding, saved: { branding?: FormBranding } | undefined): boolean =>
  !!cleanTheme(sent.theme) && !!saved?.branding && typeof saved.branding === 'object' && !cleanTheme(saved.branding.theme);

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
      // Never send a field that points at a page that is gone (the server refuses the whole save): this also heals a form that is already stuck.
      fields: repairPageRefs(snap.fields, snap.pages),
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
      if (own && typeof saved?.hasUnpublishedChanges === 'boolean') useBuilderStore.getState().setHasUnpublishedChanges(saved.hasUnpublishedChanges);
      if (own && saved && saved.draftSavedAt !== undefined) useBuilderStore.getState().setDraftSavedAt(saved.draftSavedAt);
      if (themeWasDropped(snap.branding, saved)) throw new ThemeNotSavedError();
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
      if (store.formId === formId && typeof form?.hasUnpublishedChanges === 'boolean') store.setHasUnpublishedChanges(form.hasUnpublishedChanges);
      if (store.formId === formId && form && !store.stale) store.setDraftSavedAt(form.draftSavedAt ?? null);
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
  // Reloading means giving the unsaved changes up (the person was told how many): do not bring them back afterwards.
  const { formId, discardUnsaved } = useBuilderStore.getState();
  discardUnsaved();
  if (formId) clearBackup(formId);
  window.location.reload();
}

/** A choice question with no options: the server would refuse the whole form. */
export class IncompleteChoiceError extends Error {
  constructor() {
    super('Add at least one option to every choice question');
    this.name = 'IncompleteChoiceError';
  }
}

const hasEmptyChoice = (fields: FormField[]) =>
  fields.some((f) => !f.deleted && (f.type === 'dropdown' || f.type === 'multiple_choice' || f.type === 'checkbox') && !f.options?.length);

/** After a successful save: the form is clean only if nothing was changed while the save was on its way. */
function settleSaved(sent: ReturnType<typeof freshState>) {
  const now = useBuilderStore.getState();
  const unchanged =
    now.formId === sent.formId && now.fields === sent.fields && now.formTitle === sent.formTitle && now.pages === sent.pages && now.branding === sent.branding && now.settings === sent.settings;
  if (!unchanged || !sent.formId) return;
  now.markSaved();
  clearBackup(sent.formId);
}

/** Save now whatever is unsaved, typed-but-uncommitted text included. Does nothing when the form is clean. */
export async function saveBuilderNow(opts: { keepalive?: boolean } = {}): Promise<void> {
  flushPendingEdits();
  const sent = freshState();
  if (!sent.dirty || !sent.formId || sent.formId === 'undefined') return;
  if (hasEmptyChoice(sent.fields)) throw new IncompleteChoiceError();
  await saveFormSnapshot(sent.formId, sent, opts);
  settleSaved(sent);
}

// Set when the person opens the preview, which shows the unsaved changes: leaving for it is not "leaving the form".
let previewNext = false;
export function expectPreview() {
  previewNext = true;
}

// The server's own reason for a rejected save ("Option value cannot be empty"), not just "Save failed".
export function saveErrorDetail(err: unknown): string | null {
  if (err instanceof ThemeNotSavedError) return STYLE_NOT_SAVED;
  if (err instanceof IncompleteChoiceError) return err.message;
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
  // read inside callbacks without making it a dependency (the toast function is a new one on every render)
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });
  const autoSave = useAutoSave();
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
  const stale = useBuilderStore((state) => state.stale);

  const showSaved = useCallback(() => {
    setSaveState('saved');
    setSaveDetail(null);
    setSavedAt(new Date());
    // idleTimerRef keeps this handle so the unmount cleanup below can cancel it
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      setSaveState('idle');
    }, 2000);
  }, []);

  /** The Save button, Ctrl/Cmd+S, Retry and "Save and leave". Resolves to whether everything is now saved. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    flushPendingEdits();
    const before = useBuilderStore.getState();
    if (before.stale) return false; // the header says to reload
    if (!before.dirty) return true;
    try {
      setSaveState('saving');
      await saveBuilderNow();
      showSaved();
      return true;
    } catch (err) {
      if (isFormStale(err)) {
        setSaveState('idle');
        return false;
      }
      const detail = saveErrorDetail(err);
      setSaveDetail(detail);
      setSaveState('error');
      toastRef.current(err instanceof ThemeNotSavedError ? STYLE_NOT_SAVED : detail ? `Could not save: ${detail}` : 'Could not save. Please try again.', 'error');
      return false;
    }
  }, [showSaved]);

  // Auto save
  useEffect(() => {
    if (!autoSave || !dirty || !formId || formId === 'undefined' || stale) return;

    const timer = setTimeout(async () => {
      const sent = { dirty, fields, formTitle, pages, formId, branding, settings };
      if (hasEmptyChoice(fields)) {
        setSaveState('error');
        setSaveDetail(new IncompleteChoiceError().message);
        return;
      }

      try {
        setSaveState('saving');
        await saveFormSnapshot(formId, sent);
        settleSaved(sent);
        showSaved();
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
        if (err instanceof ThemeNotSavedError) toastRef.current(STYLE_NOT_SAVED, 'error');
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [autoSave, dirty, fields, formTitle, pages, formId, branding, settings, stale, showSaved]);

  // Cancel the idle reset timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Ctrl/Cmd+S saves, also while typing, instead of the browser's "save page".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key?.toLowerCase() !== 's') return;
      e.preventDefault();
      void saveNow();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveNow]);

  // With Auto save on, save when the tab is hidden or the page is going away (auto save waits a few seconds, so the last
  // edits would otherwise not be sent).
  useEffect(() => {
    const flush = () => {
      if (!readAutoSave()) return;
      // keepalive: the browser finishes the request after the page is gone.
      void saveBuilderNow({ keepalive: true }).catch(() => {});
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

  // Closing or reloading with unsaved changes asks first. Leaving the builder inside the app: auto save sends them;
  // otherwise they stay in this browser and the person is told (the leave dialog usually asks before it gets this far).
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    previewNext = false;
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

      alive.current = false;
      flushPendingEdits();
      if (!useBuilderStore.getState().dirty) return;
      if (readAutoSave()) {
        void saveBuilderNow().catch(() => {});
        return;
      }
      if (previewNext) return;
      // Only if the builder is really gone (React's development mode removes and re-adds it at once).
      queueMicrotask(() => {
        if (!alive.current) toastRef.current('Your unsaved changes are kept in this browser. Open the form again to save them.', 'warning');
      });
    };
  }, []);

  return { saveState, setSaveState, savedAt, saveDetail, saveNow, autoSave };
}
