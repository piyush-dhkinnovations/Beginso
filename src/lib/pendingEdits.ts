import { useSyncExternalStore } from 'react';

/**
 * Edits that have been TYPED but not yet handed to the builder store: a debounced input (it commits 600 ms after the last
 * keystroke), or an option list held back because a row is empty. Until they reach the store the builder looked clean: the
 * header said "All changes saved", the leave prompt stayed silent and the page-hide save had nothing to send, so a reload in
 * that window lost the edit (QA D3-001).
 *
 * Each input registers while it holds an uncommitted change. `flushPendingEdits()` makes every one of them commit right now
 * (the store then marks itself dirty and the normal save path takes over). Not part of the form data, so it lives here and
 * not in the builder store.
 */
interface Entry {
  /** Commit the typed value to the store now. */
  flush: () => void;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Register (or replace) the uncommitted edit under `key`; pass null once it has been committed or discarded. */
export function setPendingEdit(key: string, entry: Entry | null): void {
  const had = entries.has(key);
  if (entry) entries.set(key, entry);
  else entries.delete(key);
  if (had !== !!entry) emit();
}

export const hasPendingEdits = (): boolean => entries.size > 0;

/** Commit every typed-but-uncommitted edit now. Safe to call at any time; a no-op when nothing is pending. */
export function flushPendingEdits(): void {
  for (const e of [...entries.values()]) e.flush();
}

/** True while any typed edit has not reached the builder store yet. */
export function usePendingEdits(): boolean {
  return useSyncExternalStore(subscribe, hasPendingEdits, () => false);
}

/** Test helper. */
export function resetPendingEdits(): void {
  entries.clear();
  emit();
}
