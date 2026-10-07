'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Home, FileText, Inbox, BarChart3, Users, History, Shield, LayoutTemplate, Trash2, Settings, Download } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import {
  canManageMembers,
  canManageScoring,
  canManageStages,
  canManageTags,
  canManageWorkspaceSettings,
  canRestoreResponse,
  canViewAudit,
  canViewTemplates,
  canViewExports,
} from '@/lib/roles';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
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

  // Sprint 12 (inbox-collaboration), task 1.9 — the unread count badge from the stats call
  // (design.md §4: "wireframe shows a count badge; if that call fails, no badge, no error").
  // Failing the query is deliberately not surfaced here; the badge is a convenience, not a
  // load-bearing signal, and the Inbox page itself shows its own error state if stats fail there.
  const { data: stats } = useQuery({
    queryKey: responseKeys.stats(slug),
    queryFn: () => responsesService.getStats(undefined, slug),
    retry: false,
  });

  // Real bug found and fixed: this linked to /templates, /responses, /analytics, /reports, and
  // /settings under /w/[slug] — none of which exist (only forms/, team/, roles/ did; confirmed
  // by listing src/app/w/[slug]/). Every one of those was a dead link, 404-ing on click and
  // spamming the console with Next.js's own Link-prefetch failures the moment this sidebar
  // rendered. Hidden until each page actually ships — re-add the item as each one lands, rather
  // than linking ahead of the page that would make it real. `inbox/` now exists (task 1.9,
  // same-PR rule: the nav item lands with the page, never before).
  const items = [
    { label: 'Home', href: base, icon: Home },
    { label: 'Forms', href: `${base}/forms`, icon: FileText },
    { label: 'Inbox', href: `${base}/inbox`, icon: Inbox, count: stats?.unread },
    // Insights (plan nav: Home · Inbox · Insights). Every role that can read the workspace can read analytics.
    { label: 'Insights', href: `${base}/insights`, icon: BarChart3 },
    // Exports (CSV / PDF jobs) - its own page, not a tab inside Insights.
    ...(canViewExports(role) ? [{ label: 'Exports', href: `${base}/exports`, icon: Download }] : []),
    // Sprint 13 (B6): templates live in the workspace now. Reviewers cannot create forms, so they get no
    // Templates item (same rule canViewTemplates already encodes for the role-filtered nav).
    ...(canViewTemplates(role) ? [{ label: 'Templates', href: `${base}/templates`, icon: LayoutTemplate }] : []),
    // Every role — seeing what happened in a workspace you belong to is not manager-only
    // (sprint-10 requirements.md §7.6). "Audit Log" is the role-gated counterpart (§7.7), failing
    // closed on an undefined role exactly like "Team".
    { label: 'Activity', href: `${base}/activity`, icon: History },
    ...(canManageMembers(role) ? [{ label: 'Team', href: `${base}/team`, icon: Users }] : []),
    ...(canViewAudit(role) ? [{ label: 'Audit Log', href: `${base}/audit`, icon: Shield }] : []),
    // Any role that can manage at least one settings tab; same fail-closed-on-undefined rule.
    ...(canManageWorkspaceSettings(role) || canManageTags(role) || canManageStages(role) || canManageScoring(role)
      ? [{ label: 'Settings', href: `${base}/settings`, icon: Settings }]
      : []),
    // Sprint 13 (CF5.5): Trash is an Owner/Admin surface (the server returns 403 to everyone else); fails
    // closed on an undefined role like Team and Audit Log.
    ...(canRestoreResponse(role) ? [{ label: 'Trash', href: `${base}/trash`, icon: Trash2 }] : []),
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
