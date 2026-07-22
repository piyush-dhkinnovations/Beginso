import type { FieldValue } from '@/types/publicForm';

/**
 * Persists in-progress public-form answers to localStorage, keyed by slug, so a
 * reload or lost connection mid-fill doesn't force the respondent to start over.
 * Not part of the original Sprint 3 requirements — added on request (24 Jul 2026).
 *
 * localStorage can throw (private browsing, quota exceeded, disabled) — every
 * operation is wrapped so a storage failure degrades to "no draft," never a crash.
 */

export interface FormDraft {
  pageIndex: number;
  values: Record<string, FieldValue>;
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
