'use client';

import React, { useState } from 'react';

interface Tip {
  label: string;
  top: number;
  left: number;
}

/**
 * Label for an icon-only control (the collapsed sidebar rail). It shows on mouse hover AND on keyboard focus, which the native
 * `title` attribute never did for a keyboard user, and Esc dismisses it (WCAG 1.4.13). It is drawn with position:fixed from the
 * control's own rectangle, so the rail's overflow clipping cannot hide it. The control keeps its aria-label; this is the visual
 * half only, so the tip is hidden from assistive tech to avoid reading the name twice (QA A3-006).
 */
export function RailTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [tip, setTip] = useState<Tip | null>(null);

  const show = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest('a,button') as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 8 });
  };

  return (
    <span
      className="contents"
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
      onFocus={show}
      onBlur={() => setTip(null)}
      onKeyDown={(e) => e.key === 'Escape' && setTip(null)}
    >
      {children}
      {tip && (
        <span
          role="tooltip"
          aria-hidden="true"
          style={{ position: 'fixed', top: tip.top, left: tip.left, transform: 'translateY(-50%)' }}
          className="pointer-events-none z-70 whitespace-nowrap rounded-md bg-(--surface-inverse) px-3 py-1.5 bg-caption text-(--text-inverse) shadow-(--shadow-md)"
        >
          {tip.label}
        </span>
      )}
    </span>
  );
}
