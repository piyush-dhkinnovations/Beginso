import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentForm {
  id: string;
  title: string;
}

const MAX_RECENT = 5;

interface RecentFormsState {
  // Whose list this is. localStorage is shared by every account that uses this browser, so without it a
  // second account would see (and be unable to open) the first account's forms in its sidebar.
  userId: string | null;
  // Keyed by scope ('personal' or a workspace slug) so each sidebar lists only its own forms.
  byScope: Record<string, RecentForm[]>;
  touch: (scope: string, form: RecentForm) => void;
  remove: (formId: string) => void;
  bindUser: (userId: string | null) => void;
}

// Most-recent-first, deduped by id, capped at 5. A rename updates the stored title the next time the form is opened.
export const useRecentFormsStore = create<RecentFormsState>()(
  persist(
    (set) => ({
      userId: null,
      byScope: {},
      bindUser: (userId) => set((s) => (s.userId === userId ? s : { userId, byScope: {} })),
      remove: (formId) =>
        set((s) => ({
          byScope: Object.fromEntries(Object.entries(s.byScope).map(([k, list]) => [k, list.filter((f) => f.id !== formId)])),
        })),
      touch: (scope, form) =>
        set((s) => ({
          byScope: {
            ...s.byScope,
            [scope]: [form, ...(s.byScope[scope] ?? []).filter((f) => f.id !== form.id)].slice(0, MAX_RECENT),
          },
        })),
    }),
    // skipHydration: the server renders an empty list, so the client must not read localStorage until after mount
    // (otherwise the first client render differs from the server HTML and React reports a hydration mismatch).
    { name: 'beginso_recent_forms', skipHydration: true, partialize: (s) => ({ userId: s.userId, byScope: s.byScope }) },
  ),
);

let hydrated = false;

// localStorage is synchronous, so this completes before the next line runs. Must precede any write, or the first
// write would replace the stored lists with a single-entry one.
function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  void useRecentFormsStore.persist.rehydrate();
}

/** Record a form as just opened. Client-side only (call from an effect or handler). */
export function touchRecentForm(scope: string, form: RecentForm) {
  ensureHydrated();
  useRecentFormsStore.getState().touch(scope, form);
}

/** Tie the persisted list to the signed-in account; a different (or no) account starts from an empty list. */
export function bindRecentFormsUser(userId: string | null) {
  ensureHydrated();
  useRecentFormsStore.getState().bindUser(userId);
}

/** Forget a form (e.g. it was deleted, or this account has no access to it). */
export function removeRecentForm(formId: string) {
  ensureHydrated();
  useRecentFormsStore.getState().remove(formId);
}

/** The recent forms for one scope. Hydrates the persisted list once, after mount. */
export function useRecentForms(scope: string): RecentForm[] {
  useEffect(ensureHydrated, []);
  return useRecentFormsStore((s) => s.byScope[scope]) ?? EMPTY;
}

const EMPTY: RecentForm[] = [];
