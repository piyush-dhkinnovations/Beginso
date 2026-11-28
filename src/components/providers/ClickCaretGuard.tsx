'use client';

import { useEffect } from 'react';

const CARET_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * With the browser's caret browsing on (F7), clicking any words leaves a blinking text cursor in them. This marks the page
 * after a click, and globals.css hides that cursor outside typing boxes. Moving by keyboard removes the mark, so people who
 * read with caret browsing still see where they are.
 */
export function ClickCaretGuard() {
  useEffect(() => {
    const root = document.documentElement;
    const onPointer = () => root.setAttribute('data-clicked', '');
    const onKey = (e: KeyboardEvent) => {
      if (CARET_KEYS.has(e.key)) root.removeAttribute('data-clicked');
    };
    // Captured, so a component that stops the event cannot leave the cursor in the wrong state.
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      root.removeAttribute('data-clicked');
    };
  }, []);
  return null;
}
