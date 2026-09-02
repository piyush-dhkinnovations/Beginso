'use client';
import { useEffect, useRef, useState } from 'react';

// Returns 0 to 1 as the element travels from the bottom of the viewport up
// toward the top. Drives the hero tilt so it tracks the scroll rather than
// firing once.
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [progress, setProgress] = useState(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const top = el.getBoundingClientRect().top;
      const start = window.innerHeight;         // element top at viewport bottom
      const end = window.innerHeight * 0.25;    // element top near viewport top
      const p = (start - top) / (start - end);
      setProgress(Math.min(Math.max(p, 0), 1));
    };

    // rAF-throttled: never more than one calculation per frame.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [prefersReducedMotion]);

  return { ref, progress };
}
