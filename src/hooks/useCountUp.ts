'use client';
import { useEffect, useState } from 'react';
import { useReveal } from './useReveal';

export function useCountUp(target: number, duration = 1200) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.4);
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (!visible || prefersReducedMotion) return;

    let frame = 0;
    const started = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);        // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, target, duration, prefersReducedMotion]);

  return { ref, value };
}
