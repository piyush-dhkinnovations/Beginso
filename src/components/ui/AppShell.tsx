"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { bx } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface AppShellProps {
  initialCollapsed?: boolean;
  sidebar: (collapsed: boolean) => React.ReactNode;
  topBar: (toggleCollapsed: () => void, toggleMobile?: () => void) => React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// Composes Sidebar + TopBar + a content region. Geometry derived from the V2 wireframe:
// TopBar full-bleed (height 56px), Sidebar left-docked (width 220-240px / 64px rail),
// Content pane filling remaining space with 24px padding and 20px gap.
// Collapse state follows the existing sidebar_collapsed cookie pattern.
// Supports mobile off-canvas drawer with focus trap and backdrop (task 3.3).
export function AppShell({
  initialCollapsed = false,
  sidebar,
  topBar,
  children,
  className,
  contentClassName,
  mobileOpen: controlledMobileOpen,
  onMobileClose,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = controlledMobileOpen ?? internalMobileOpen;
  const handleMobileClose = onMobileClose ?? (() => setInternalMobileOpen(false));

  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(mobileOpen, handleMobileClose, drawerRef);

  // Written as an effect, not inline in the toggle handler, so the mutation isn't reachable
  // from the render-prop calls below (topBar/sidebar run during render) — the compiler's
  // immutability check otherwise flags document.cookie as a render-time side effect.
  useEffect(() => {
    document.cookie = `sidebar_collapsed=${collapsed}; path=/; max-age=31536000; SameSite=Lax`;
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);
  const toggleMobile = () => {
    if (controlledMobileOpen === undefined) {
      setInternalMobileOpen((prev) => !prev);
    }
  };

  return (
    <div className={bx("flex flex-col min-h-screen", className)}>
      {topBar(toggleCollapsed, toggleMobile)}

      {/* Off-canvas mobile drawer */}
      {mobileOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-neutral-900/40 animate-fade-in md:hidden"
          onClick={handleMobileClose}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute left-0 top-0 bottom-0 w-[240px] max-w-[80vw] bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-2 border-b border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={handleMobileClose}
                aria-label="Close navigation menu"
                className="bg-btn bg-btn-ghost bg-btn-icon"
              >
                <X size={18} className="bg-icon" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebar(false)}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {sidebar(collapsed)}
        <main className={bx("flex-1 overflow-y-auto p-6 flex flex-col gap-5", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}


