import React from "react";
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
}

// Generic components/ui/ primitive — distinct from src/components/dashboard/Sidebar.tsx
// (V1, hand-built, stays untouched this sprint; see design.md §6/§23). Unused by any live
// screen until Sprint 8 rebuilds DashboardShell around ContextSwitcher.
// beginso-ui.css §12 NAVIGATION (.bg-sidenav / .bg-nav-item / .bg-sidenav-rail).
export function Sidebar({ groups, collapsed = false, className, ...props }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className={bx("bg-sidenav", collapsed && "bg-sidenav-rail", className)}
      {...props}
    >
      {groups.map((group, gi) => (
        <React.Fragment key={group.label ?? `group-${gi}`}>
          {group.label && <div className="bg-nav-group">{group.label}</div>}
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className="bg-nav-item"
                aria-current={item.active ? "page" : undefined}
              >
                {Icon && <Icon className="bg-icon" />}
                <span className="bg-nav-label">{item.label}</span>
                {typeof item.count === "number" && <span className="bg-count">{item.count}</span>}
              </a>
            );
          })}
        </React.Fragment>
      ))}
    </nav>
  );
}
