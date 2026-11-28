import { useSyncExternalStore } from 'react';

// Whether the form builder saves by itself. Off unless the person turns it on in Account settings → Form builder, and
// remembered on this device only.
export const AUTOSAVE_KEY = 'beginso.builderAutoSave';
const CHANGED = 'beginso-autosave-changed';

export function readAutoSave(): boolean {
  try {
    return window.localStorage.getItem(AUTOSAVE_KEY) === 'on';
  } catch {
    return false; // storage blocked: the default
  }
}

export function storeAutoSave(on: boolean): void {
  try {
    window.localStorage.setItem(AUTOSAVE_KEY, on ? 'on' : 'off');
  } catch {
    // not remembered on this device
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(notify: () => void) {
  window.addEventListener(CHANGED, notify);
  window.addEventListener('storage', notify); // the setting changed in another tab
  return () => {
    window.removeEventListener(CHANGED, notify);
    window.removeEventListener('storage', notify);
  };
}

export const useAutoSave = (): boolean => useSyncExternalStore(subscribe, readAutoSave, () => false);
