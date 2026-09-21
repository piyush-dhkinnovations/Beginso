'use client';

import { usePathname } from 'next/navigation';
import { Home, FileText, Users, History, Shield } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { canManageMembers, canViewAudit } from '@/lib/roles';
import type { Role } from '@/types/workspace';

export interface WorkspaceSidebarProps {
  slug: string;
  currentLabel: string;
  collapsed?: boolean;
  // Sprint 9 (team-permissions, requirements.md §7.2/§8.7) — the caller's role in this
  // workspace, used to gate "Team" (owner/admin only). Undefined until BE 0.1 ships
  // (GET /api/workspaces/:id doesn't return it yet). canManageMembers() fails closed on
  // undefined (Team stays hidden until the backend lands).
  role?: Role;
}

// Workspace-context nav set (requirements.md §7.3). Same item vocabulary/icons as the legacy
// src/components/dashboard/Sidebar.tsx (V1, untouched this sprint — design.md §2), scoped under
// /w/[slug] instead of the flat (user)/ tree. Reads the active route via usePathname() itself,
// same reasoning as PersonalSidebar.
//
// Corrected against the actual wireframe (Beginso-Design-System/.../wireframes/index.html,
// appSidebar()/contextSwitcher()) — the context switcher belongs at the top of the sidebar itself
// ("the sidebar context block is now the real control"), not in the top bar where it was first
// built. Rendered via ui/Sidebar's `header` slot rather than a separate wrapper element, so it
// sits inside the same .bg-sidenav box as the nav items (matching the wireframe's single
// continuous sidebar column) instead of a second bordered block stacked above it.
export function WorkspaceSidebar({ slug, currentLabel, collapsed = false, role }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const base = `/w/${slug}`;
  // Real bug found and fixed: this linked to /templates, /responses, /analytics, /reports, and
  // /settings under /w/[slug] — none of which exist (only forms/, team/, roles/ do; confirmed
  // by listing src/app/w/[slug]/). Every one of those was a dead link, 404-ing on click and
  // spamming the console with Next.js's own Link-prefetch failures the moment this sidebar
  // rendered. Hidden until each page actually ships — re-add the item as each one lands, rather
  // than linking ahead of the page that would make it real.
  const items = [
    { label: 'Home', href: base, icon: Home },
    { label: 'Forms', href: `${base}/forms`, icon: FileText },
    // Every role — seeing what happened in a workspace you belong to is not manager-only
    // (sprint-10 requirements.md §7.6). "Audit Log" is the role-gated counterpart (§7.7), failing
    // closed on an undefined role exactly like "Team".
    { label: 'Activity', href: `${base}/activity`, icon: History },
    ...(canManageMembers(role) ? [{ label: 'Team', href: `${base}/team`, icon: Users }] : []),
    ...(canViewAudit(role) ? [{ label: 'Audit Log', href: `${base}/audit`, icon: Shield }] : []),
  ];

  return (
    <Sidebar
      collapsed={collapsed}
      header={<WorkspaceContextSwitcher currentLabel={currentLabel} collapsed={collapsed} />}
      groups={[
        {
          items: items.map((item) => ({
            ...item,
            active: item.href === base ? pathname === base : pathname.startsWith(item.href),
          })),
        },
      ]}
    />
  );
}
