'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Home, FileText, LayoutTemplate, Table2, Settings, Plus, Share2, Trash2, ClipboardList, Download } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { useBuilderStore } from '@/store/builderStore';
import { dashboardService } from '@/services/dashboard';
import { formsService } from '@/services/forms';
import { dashboardKeys, notificationKeys, workspaceKeys } from '@/lib/queryKeys';
import { notificationsService } from '@/services/notifications';
import { StorageUsage } from '@/components/workspaces/StorageUsage';

export interface PersonalSidebarProps {
  collapsed?: boolean;
}

// Personal-context nav set. Originally scoped to A1.1's 4-item list (Home, Forms, Templates,
// Create workspace) — corrected here to also carry the header context switcher (this file was
// built before any layout actually mounted it, so nothing wired a switcher into personal space
// at all; see the account-facing bug this fixes: a signed-in user had no discoverable path from
// Personal space into a workspace anywhere in the rendered UI) and the four top-level pages that
// still genuinely exist and work today — Inbox, Insights, Exports, Settings. A1.1's smaller
// item list is the eventual V2 design once those pages move to per-form drill-in / the account
// menu (CLAUDE.md V2 conventions), but that migration hasn't happened yet; dropping the links now
// would silently remove real, currently-reachable functionality. Kept until that migration lands.
//
// "Shared with me" (A3, -> C2.7) closed this sprint (requirements.md §7.9) — the /shared route
// and its data source (GET /api/shared-with-me) now exist, so it's a permanent item below,
// positioned right after "Forms" per the wireframe's PERSONAL_NAV order. "My Submissions"
// (A5.1) remains deliberately omitted — same reasoning as before: no data source / route exists
// yet (Sprint 13).
export function PersonalSidebar({ collapsed = false }: PersonalSidebarProps) {
  const pathname = usePathname();
  const dirty = useBuilderStore((state) => state.dirty);
  const setPendingLeaveUrl = useBuilderStore((state) => state.setPendingLeaveUrl);
  // Shares its cache with (user)/dashboard/page.tsx's identical query key — no extra request
  // once the dashboard has loaded it. This sidebar only ever renders inside the already
  // auth-protected (user)/ layout, so no separate auth gate is needed here. Defaults to "has
  // forms" (item shown) until we actually know otherwise, so nav items don't flash
  // hidden-then-visible while this loads.
  const { data: analytics } = useQuery({
    queryKey: dashboardKeys.analytics(),
    queryFn: dashboardService.getAnalytics,
  });
  // Real bug found and fixed: `analytics.totalForms` leaks a workspace-owned form into its count
  // for a brand-new user whose default workspace is the one they just joined via invite accept
  // (formsService.getForms()'s own comment has the full root-cause) — this sidebar then kept
  // Responses/Analytics/Reports visible for an account with zero real personal forms. `getForms`
  // is already fixed to filter that leak out, so prefer its (small, cheap) count here instead of
  // trusting the separate, still-contaminated analytics aggregate.
  const { data: personalForms } = useQuery({
    queryKey: workspaceKeys.forms({ type: 'personal' }, { page: 1, limit: 1 }),
    queryFn: () => formsService.getForms({ page: 1, limit: 1 }, { type: 'personal' }),
  });
  const hasForms = personalForms
    ? personalForms.total > 0
    : analytics
      ? analytics.totalForms > 0
      : true;
  // Same guard src/components/dashboard/Sidebar.tsx already enforces — must be preserved by
  // whichever sidebar is actually mounted, since the confirm-leave modal
  // ((user)/forms/[id]/edit/page.tsx) only fires when something actually calls
  // setPendingLeaveUrl() instead of navigating straight away.
  const isInBuilder = pathname.startsWith('/forms/') && pathname.endsWith('/edit');
  const guard = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isInBuilder && dirty) {
      event.preventDefault();
      setPendingLeaveUrl(href);
    }
  };

  // Blue count on "Shared with me" while someone's share is unseen (cleared when that page is opened).
  const { data: sharedUnread = 0 } = useQuery({
    queryKey: notificationKeys.unreadOfType('personal', 'form_shared'),
    queryFn: () => notificationsService.unreadCount('personal', 'form_shared'),
    retry: false,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  // Responses owns the form-level data pages too (/forms/:id/inbox and /insights); Forms keeps the rest.
  const isFormDataRoute = /^\/forms\/[^/]+\/(inbox|insights)\/?$/.test(pathname);
  const isResponsesActive = isFormDataRoute || /^\/(form-responses|inbox|insights)(\/|$)/.test(pathname);

  return (
    <Sidebar
      collapsed={collapsed}
      header={<WorkspaceContextSwitcher currentLabel="Personal" collapsed={collapsed} />}
      footer={
        <>
          {!collapsed && <StorageUsage />}
          <UserProfileDropdown variant="sidebar" collapsed={collapsed} />
        </>
      }
      groups={[
        // Grouped by job; every item keeps its icon so the list reads evenly.
        {
          items: [
            { label: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard', onClick: guard('/dashboard') },
            { label: 'Forms', href: '/forms', icon: FileText, active: pathname.startsWith('/forms') && !isFormDataRoute, onClick: guard('/forms') },
            // Nothing to show until a form exists - hidden rather than left to render an empty state. Still shown
            // while loading (hasForms defaults true) and when deep-linked, so an active page never vanishes from its nav.
            ...(hasForms || isResponsesActive
              ? [{ label: 'Responses', href: '/form-responses', icon: Table2, active: isResponsesActive, onClick: guard('/form-responses') }]
              : []),
          ],
        },
        {
          label: 'Library',
          items: [
            { label: 'Shared with me', href: '/shared', icon: Share2, count: sharedUnread > 0 ? sharedUnread : undefined, active: pathname.startsWith('/shared'), onClick: guard('/shared') },
            { label: 'Templates', href: '/templates', icon: LayoutTemplate, active: pathname.startsWith('/templates'), onClick: guard('/templates') },
            // A5.1 / wireframe 31: always in the personal nav (an empty state explains it).
            { label: 'My Submissions', href: '/my-submissions', icon: ClipboardList, active: pathname.startsWith('/my-submissions'), onClick: guard('/my-submissions') },
            ...(hasForms || pathname.startsWith('/exports')
              ? [{ label: 'Exports', href: '/exports', icon: Download, active: pathname.startsWith('/exports'), onClick: guard('/exports') }]
              : []),
          ],
        },
        {
          label: 'Account',
          items: [
            { label: 'Trash', href: '/trash', icon: Trash2, active: pathname.startsWith('/trash'), onClick: guard('/trash') },
            { label: 'Settings', href: '/settings', icon: Settings, active: pathname.startsWith('/settings'), onClick: guard('/settings') },
          ],
        },
        {
          items: [
            {
              label: 'Create workspace',
              href: '/workspaces/new',
              icon: Plus,
              active: pathname.startsWith('/workspaces'),
              onClick: guard('/workspaces/new'),
            },
          ],
        },
      ]}
    />
  );
}
