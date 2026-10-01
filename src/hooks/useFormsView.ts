'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type FormsView = 'list' | 'grid';

const KEY = 'beginso.forms.view';
const EVENT = 'beginso:forms-view';

function read(): FormsView {
  try {
    return window.localStorage.getItem(KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list'; // storage blocked (private window etc.) — fall back, never throw
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** The user's list/grid choice for the Forms page, remembered in this browser. Renders 'list' on the
 * server and first paint, then switches to the saved value — no hydration mismatch. */
export function useFormsView(): [FormsView, (view: FormsView) => void] {
  const view = useSyncExternalStore(subscribe, read, () => 'list' as FormsView);
  const setView = useCallback((next: FormsView) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* not persisted — the in-session choice below still applies */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [view, setView];
}
