"use client";

import React, { useEffect, useState } from "react";
import { bx } from "@/lib/utils";

export interface AppShellProps {
  initialCollapsed?: boolean;
  sidebar: (collapsed: boolean) => React.ReactNode;
  topBar: (toggleCollapsed: () => void) => React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// Composes Sidebar + TopBar + a content region. Collapse state follows the existing
// sidebar_collapsed cookie pattern (src/app/(user)/layout.tsx + DashboardShell) — the
// server reads the cookie and passes initialCollapsed in, so first render is already
// correct; this component owns the toggle and writes the cookie back on change, rather
// than inventing a second collapse-persistence mechanism.
// Unused by any live screen this sprint — DashboardShell migrates onto it in Sprint 8
// once the sidebar is rebuilt around ContextSwitcher (design.md §23), avoiding rebuilding
// the same shell twice in consecutive sprints.
export function AppShell({ initialCollapsed = false, sidebar, topBar, children, className }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Written as an effect, not inline in the toggle handler, so the mutation isn't reachable
  // from the render-prop calls below (topBar/sidebar run during render) — the compiler's
  // immutability check otherwise flags document.cookie as a render-time side effect.
  useEffect(() => {
    document.cookie = `sidebar_collapsed=${collapsed}; path=/; max-age=31536000; SameSite=Lax`;
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  return (
    <div className={bx("flex flex-col min-h-screen", className)}>
      {topBar(toggleCollapsed)}
      <div className="flex flex-1">
        {sidebar(collapsed)}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
