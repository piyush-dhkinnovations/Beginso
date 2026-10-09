import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentForm {
  id: string;
  title: string;
}

const MAX_RECENT = 5;

interface RecentFormsState {
  // Keyed by scope ('personal' or a workspace slug) so each sidebar lists only its own forms.
  byScope: Record<string, RecentForm[]>;
  touch: (scope: string, form: RecentForm) => void;
}

// Most-recent-first, deduped by id, capped at 5. A rename updates the stored title the next time the form is opened.
export const useRecentFormsStore = create<RecentFormsState>()(
  persist(
    (set) => ({
      byScope: {},
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
    { name: 'beginso_recent_forms', skipHydration: true, partialize: (s) => ({ byScope: s.byScope }) },
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

/** The recent forms for one scope. Hydrates the persisted list once, after mount. */
export function useRecentForms(scope: string): RecentForm[] {
  useEffect(ensureHydrated, []);
  return useRecentFormsStore((s) => s.byScope[scope]) ?? EMPTY;
}

const EMPTY: RecentForm[] = [];
