import React from "react";
import Link from "next/link";
import { bx } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
  count?: number;
}

export interface SidebarNavGroup {
  label?: string;
  items: SidebarNavItem[];
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  groups: SidebarNavGroup[];
  collapsed?: boolean;
  /** Rendered as the first child inside .bg-sidenav, above the nav groups — the wireframe's own
   * design (Beginso-Design-System/.../wireframes/index.html, appSidebar()) puts the context
   * switcher here, not in the top bar: "the sidebar context block is now the real control." */
  header?: React.ReactNode;
  /** Rendered at the bottom of the sidebar, pinned via mt-auto (e.g. account row) */
  footer?: React.ReactNode;
}

// Generic components/ui/ primitive — distinct from src/components/dashboard/Sidebar.tsx
// (V1, hand-built, stays untouched this sprint; see design.md §6/§23). Unused by any live
// screen until Sprint 8 rebuilds DashboardShell around ContextSwitcher.
// beginso-ui.css §12 NAVIGATION (.bg-sidenav / .bg-nav-item / .bg-sidenav-rail).
// Uses next/link (not a raw <a>, fixed sprint-8 day 1) so real consumers navigate client-side —
// the legacy src/components/dashboard/Sidebar.tsx already does the same.
export function Sidebar({ groups, collapsed = false, header, footer, className, ...props }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className={bx("bg-sidenav", collapsed && "bg-sidenav-rail", className)}
      {...props}
    >
      {header}
      {groups.map((group, gi) => (
        <React.Fragment key={group.label ?? `group-${gi}`}>
          {group.label && <div className="bg-nav-group">{group.label}</div>}
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-nav-item"
                aria-current={item.active ? "page" : undefined}
              >
                {Icon && <Icon className="bg-icon" />}
                <span className="bg-nav-label">{item.label}</span>
                {typeof item.count === "number" && <span className="bg-count">{item.count}</span>}
              </Link>
            );
          })}
        </React.Fragment>
      ))}
      {footer && <div className="mt-auto">{footer}</div>}
    </nav>
  );
}
