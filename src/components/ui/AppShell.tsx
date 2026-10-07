"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { bx } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Wordmark } from "@/components/landing/Wordmark";

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
// TopBar full-bleed (height 56px), Sidebar left-docked (width 220-240px / 64px rail).
// Content pane owns the app's page width in this one place: 16/32/48px horizontal padding
// at <768/768-1279/>=1280px, 24/32px top padding below/above 768px, 64px bottom padding so
// the last element never sits flush against the viewport, capped at 1600px and centred so a
// dashboard uses the width it has without a table row running edge-to-edge on an ultrawide.
// Pages render straight into this — no per-page max-w/mx-auto wrapper.
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
      <div className="sticky top-0 z-20">{topBar(toggleCollapsed, toggleMobile)}</div>

      {/* Off-canvas mobile drawer */}
      {mobileOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/40 animate-fade-in md:hidden"
          onClick={handleMobileClose}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute left-0 top-0 bottom-0 w-55 max-w-[80vw] bg-(--surface-card) shadow-(--shadow-lg) z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-(--border-default)">
              <Wordmark height={32} />
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
        {/* The page itself scrolls (native, edge-flush scrollbar); the sidebar is pinned to the
            viewport with position:fixed inside a same-width spacer. It was `sticky`, which only
            holds while the row is as tall as the scrollable area — any page whose scroll extent
            outran the row (e.g. the Responses chart view) carried the sidebar up with it.
            overflow-y-auto is a safety net for a viewport too short for every nav item, not the
            primary scroll mechanism. bg-topbar is 52px and .bg-sidenav 220px / .bg-sidenav-rail
            64px (beginso-ui.css §12) — keep the spacer widths in step with those. */}
        <aside className={bx("hidden md:block shrink-0", collapsed ? "w-16" : "w-55")}>
          <div className="fixed top-13 bottom-0 flex overflow-y-auto">{sidebar(collapsed)}</div>
        </aside>
        <main
          className={bx(
            // sprint-11-v2a-hardening 5.1 — real bug found by the width pass: a flex item's
            // default min-width is `auto`, not 0, so this column refused to shrink below its
            // widest child's intrinsic width. Any page with a wide inner table (Roles matrix,
            // Audit log, any `.bg-table-wrap`) grew the *entire page* past the viewport instead
            // of scrolling inside its own `overflow-x: auto` wrapper — a page-level horizontal
            // scroll bug on every such screen, not just the two with a documented "scrolls
            // inside its container" exception. One shared fix here (every V2a/V1 page routes
            // through this single `<main>`), not five per-page patches.
            "flex-1 min-w-0 flex flex-col gap-4 w-full max-w-[1600px] mx-auto",
            "px-4 pt-6 pb-16 md:px-8 md:pt-8 xl:px-12",
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}


