import { useEffect } from 'react';
import { useBuilderStore } from '@/store/builderStore';

// Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl+Y go through the store's undo/redo. Skipped while typing so
// text inputs keep the browser's own text undo.
export function useBuilderUndoShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      // A key event aimed at window or document has no closest().
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const k = e.key?.toLowerCase();
      if (!k) return;
      const store = useBuilderStore.getState();
      if (k === 'z' && !e.shiftKey) store.undo();
      else if ((k === 'z' && e.shiftKey) || k === 'y') store.redo();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
