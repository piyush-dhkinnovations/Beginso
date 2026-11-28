import { useMemo, useState, useSyncExternalStore } from 'react';
import type { Form, FormBranding, FormField, FormPage, FormSettings } from '@/types/form';

// The builder's unsaved changes, copied into this browser so a crash, a closed tab or a reload does not lose them, and so
// the preview can show them without saving. One copy per form; it is removed once the changes are saved or discarded.

export interface BuilderDraft {
  formTitle: string;
  fields: FormField[];
  pages: FormPage[];
  branding: FormBranding;
  settings: FormSettings;
}

export interface BuilderBackup {
  /** Only this person is offered the copy again. */
  userId: string;
  savedAt: number;
  /** What the server had when these changes were made, to notice that the form was changed elsewhere since. */
  baseVersion: number | null;
  baseDraftSavedAt: string | null;
  draft: BuilderDraft;
}

const keyOf = (formId: string) => `beginso.builderDraft.${formId}`;
const CHANGED = 'beginso-builder-draft-changed';

export const draftOf = ({ formTitle, fields, pages, branding, settings }: BuilderDraft): BuilderDraft => ({ formTitle, fields, pages, branding, settings });

function readRaw(formId: string): string | null {
  try {
    return window.localStorage.getItem(keyOf(formId));
  } catch {
    return null;
  }
}

function parse(raw: string | null, userId: string | undefined): BuilderBackup | null {
  if (!raw || !userId) return null;
  try {
    const b = JSON.parse(raw) as BuilderBackup;
    const d = b?.draft;
    return b.userId === userId && !!d && Array.isArray(d.fields) && Array.isArray(d.pages) && d.pages.length > 0 ? b : null;
  } catch {
    return null;
  }
}

export const readBackup = (formId: string, userId: string | undefined): BuilderBackup | null => parse(readRaw(formId), userId);

export function writeBackup(formId: string, backup: BuilderBackup): void {
  try {
    window.localStorage.setItem(keyOf(formId), JSON.stringify(backup));
  } catch {
    return; // storage full or blocked: the leave warning still protects the changes
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function clearBackup(formId: string): void {
  try {
    window.localStorage.removeItem(keyOf(formId));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGED, notify);
  window.addEventListener('storage', notify); // written by the builder in another tab or frame
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener('storage', notify);
  };
}

/**
 * The form as the preview should draw it: with this browser's unsaved changes over the saved copy. Once they are saved the
 * copy is removed and the last one seen stays on screen (it is what was just saved), so nothing has to be fetched again.
 */
export function useUnsavedPreview(formId: string, userId: string | undefined, saved: Form | undefined): { form: Form | undefined; unsaved: boolean } {
  const raw = useSyncExternalStore(subscribe, () => readRaw(formId), () => null);
  const backup = useMemo(() => parse(raw, userId), [raw, userId]);
  const [last, setLast] = useState<BuilderBackup | null>(null);
  if (backup && backup !== last) setLast(backup);

  const draft = (backup ?? last)?.draft;
  const form = useMemo(
    () =>
      saved && draft
        ? { ...saved, title: draft.formTitle, fields: draft.fields, pages: draft.pages, branding: draft.branding, settings: { ...saved.settings, ...draft.settings } }
        : saved,
    [saved, draft]
  );
  return { form, unsaved: !!backup };
}
