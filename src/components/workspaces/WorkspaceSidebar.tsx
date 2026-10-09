'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Home, FileText, Inbox, BarChart3, Users, History, Shield, LayoutTemplate, Trash2, Settings, Download } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import {
  canManageMembers,
  canRestoreResponse,
  canViewAudit,
  canViewTemplates,
  canViewExports,
} from '@/lib/roles';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { useBuilderStore } from '@/store/builderStore';
import { useRecentForms } from '@/store/recentFormsStore';
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
  /** True on a form's own pages (/forms/:id/*), which live outside /w/[slug]: lights "Forms". */
  formContext?: boolean;
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
export function WorkspaceSidebar({ slug, currentLabel, collapsed = false, role, formContext = false }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const dirty = useBuilderStore((state) => state.dirty);
  const setPendingLeaveUrl = useBuilderStore((state) => state.setPendingLeaveUrl);
  // Same unsaved-changes guard PersonalSidebar enforces: this sidebar stays mounted around the builder.
  const guard = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (formContext && dirty && /\/edit$/.test(pathname)) {
      event.preventDefault();
      setPendingLeaveUrl(href);
    }
  };
  const base = `/w/${slug}`;
  const recent = useRecentForms(slug);

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
  const isActive = (href: string) =>
    href === `${base}/forms` && formContext ? true : href === base ? pathname === base : pathname.startsWith(href);
  const toItem = (item: { label: string; href: string; icon: React.ComponentType<{ className?: string }>; count?: number }) => ({
    ...item,
    active: isActive(item.href),
    onClick: guard(item.href),
  });

  // Primary: the four daily destinations (every role that can read the workspace can read Insights).
  const primary = [
    toItem({ label: 'Home', href: base, icon: Home }),
    {
      ...toItem({ label: 'Forms', href: `${base}/forms`, icon: FileText }),
      subItems: recent.map((f) => {
        const href = `/forms/${f.id}/overview?ws=${encodeURIComponent(slug)}`;
        return { label: f.title, href, active: pathname.startsWith(`/forms/${f.id}`), onClick: guard(href) };
      }),
    },
    toItem({ label: 'All responses', href: `${base}/inbox`, icon: Inbox, count: stats?.unread }),
    toItem({ label: 'Insights', href: `${base}/insights`, icon: BarChart3 }),
  ];

  // Settings is visible to every role (members reach their own notification setting there; the page only lists
  // the sections the role can use) and still fails closed while the role is unknown.
  const settings = role ? [toItem({ label: 'Settings', href: `${base}/settings`, icon: Settings })] : [];
  const adminOnly = [
    ...(canManageMembers(role) ? [toItem({ label: 'Team', href: `${base}/team`, icon: Users })] : []),
    ...(canViewAudit(role) ? [toItem({ label: 'Audit log', href: `${base}/audit`, icon: Shield })] : []),
    // Trash is an Owner/Admin surface (the server returns 403 to everyone else).
    ...(canRestoreResponse(role) ? [toItem({ label: 'Trash', href: `${base}/trash`, icon: Trash2 })] : []),
  ];

  const workspaceItems = [
    // Reviewers cannot create forms, so they get no Templates item.
    ...(canViewTemplates(role) ? [toItem({ label: 'Templates', href: `${base}/templates`, icon: LayoutTemplate })] : []),
    ...(canViewExports(role) ? [toItem({ label: 'Exports', href: `${base}/exports`, icon: Download })] : []),
    // Seeing what happened in a workspace you belong to is not manager-only.
    toItem({ label: 'Activity', href: `${base}/activity`, icon: History }),
    // With no admin items, Settings belongs with the rest of the workspace group instead of a lone "Admin" label.
    ...(adminOnly.length === 0 ? settings : []),
  ];

  const groups = [
    { items: primary },
    { label: 'Workspace', items: workspaceItems },
    ...(adminOnly.length > 0 ? [{ label: 'Admin', items: [...adminOnly.slice(0, 2), ...settings, ...adminOnly.slice(2)] }] : []),
  ];

  return (
    <Sidebar
      collapsed={collapsed}
      header={<WorkspaceContextSwitcher currentLabel={currentLabel} collapsed={collapsed} />}
      groups={groups}
      footer={<UserProfileDropdown variant="sidebar" collapsed={collapsed} />}
    />
  );
}
