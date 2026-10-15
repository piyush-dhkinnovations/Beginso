"use client";

import type { ReactNode } from "react";

// A card with a soft light under the pointer (CSS in globals.css, `.spot`). The pointer position goes straight into two
// CSS variables, so moving the mouse never re-renders React. Touch devices and reduced-motion get a plain card.
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`spot ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}
