import { useLayoutEffect, useRef, useState } from 'react';

const DURATION = 320;

// Where nothing can move (no Web Animations, or the person asked for less motion) a panel simply appears and goes.
const canAnimate = () =>
  typeof Element !== 'undefined' &&
  typeof Element.prototype.animate === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * A panel that grows open and folds shut, so the eye can follow what moved. `rendered` stays true while it folds away;
 * `onOpened` runs once it is fully open (or at the next frame where nothing animates).
 */
export function useExpand(open: boolean, onOpened: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(open);
  if (open && !rendered) setRendered(true);
  if (!open && rendered && !canAnimate()) setRendered(false);

  const opened = useRef(onOpened);
  useLayoutEffect(() => {
    opened.current = onOpened;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!canAnimate()) {
      if (!open) return;
      const frame = requestAnimationFrame(() => opened.current());
      return () => cancelAnimationFrame(frame);
    }
    const shut = { height: '0px', opacity: 0 };
    const full = { height: `${el.scrollHeight}px`, opacity: 1 };
    const animation = el.animate(open ? [shut, full] : [full, shut], {
      duration: DURATION,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      // A folded panel must not spring open again in the moment before it is removed.
      fill: open ? 'none' : 'forwards',
    });
    animation.onfinish = () => (open ? opened.current() : setRendered(false));
    return () => animation.cancel();
  }, [open, rendered]);

  return { ref, rendered };
}
