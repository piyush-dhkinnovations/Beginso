import type { FormField } from '@/types/form';
import type { FieldValue } from '@/types/publicForm';

/**
 * Persists in-progress public-form answers to localStorage, keyed by slug, so a
 * reload or lost connection mid-fill doesn't force the respondent to start over.
 *
 * localStorage can throw (private browsing, quota exceeded, disabled) — every
 * operation is wrapped so a storage failure degrades to "no draft," never a crash.
 */

export interface FormDraft {
  pageIndex: number;
  values: Record<string, FieldValue>;
}

/** The saved answers the form can still take: a question may have changed type since they were typed. */
export function usableDraftValues(values: FormDraft['values'], fields: readonly FormField[]): FormDraft['values'] {
  const types = new Map(fields.map((f) => [f.fieldId, f.type]));
  return Object.fromEntries(
    Object.entries(values).filter(([id, value]) => {
      const type = types.get(id);
      if (type === 'file_upload' || type === 'image_upload' || type === 'signature') return false;
      return !Array.isArray(value) || type === 'checkbox';
    })
  );
}

function draftKey(slug: string): string {
  return `beginso:draft:${slug}`;
}

export function saveDraft(slug: string, draft: FormDraft): void {
  try {
    localStorage.setItem(draftKey(slug), JSON.stringify(draft));
  } catch {
    // storage unavailable/full — silently skip, nothing to recover from here
  }
}

export function loadDraft(slug: string): FormDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.values !== 'object') return null;
    return { pageIndex: typeof parsed.pageIndex === 'number' ? parsed.pageIndex : 0, values: parsed.values };
  } catch {
    return null;
  }
}

export function clearDraft(slug: string): void {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {
    // nothing to do if storage is unavailable
  }
}
