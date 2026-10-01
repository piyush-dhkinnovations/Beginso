'use client';

import { useCallback, useState } from 'react';

/** Callback ref + the element's current content width, kept in sync by a ResizeObserver. */
export function useWidth(fallback = 480): [(node: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(fallback);
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const measure = () => setWidth(Math.max(Math.round(node.getBoundingClientRect().width), 160));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
