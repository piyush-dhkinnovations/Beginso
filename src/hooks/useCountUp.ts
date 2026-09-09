'use client';
import { useEffect, useState } from 'react';
import { useReveal } from './useReveal';

export function useCountUp(target: number, duration = 1200) {
  const { ref, visible } = useReveal<HTMLSpanElement>(0.4);
  // Starts at 0 on both server and client — see useReveal.ts for why matchMedia can't seed
  // this at render time without disagreeing with the server-rendered HTML.
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!visible) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Reading matchMedia once on mount to seed state — same accepted pattern as
      // LoginForm.tsx's reason= check.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }

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
  }, [visible, target, duration]);

  return { ref, value };
}
