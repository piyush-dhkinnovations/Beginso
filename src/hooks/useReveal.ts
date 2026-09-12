'use client';
import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  // Starts false on both server and client — window.matchMedia can't run during render
  // (no window on the server), so seeding this from it here made the very first client
  // render disagree with the server-rendered HTML for anyone with reduced-motion set,
  // a hydration mismatch. Reduced-motion is checked inside the effect below instead.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Reading matchMedia once on mount to seed state — same accepted pattern as
      // LoginForm.tsx's reason= check.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true); // skip straight to the final state, never animate
      return;
    }
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();   // reveal once, never re-hide on scroll up
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
