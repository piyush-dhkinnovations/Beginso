'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
<<<<<<< Updated upstream
import { Home, FileText, LayoutTemplate, Table2, PieChart, Download, Settings, Plus, Share2 } from 'lucide-react';
=======
import { POLL_MS } from '@/hooks/useUnreadCount';
import { Home, FileText, LayoutTemplate, Table2, BarChart3, Settings, Plus, Share2, Trash2, ClipboardList, Download } from 'lucide-react';
>>>>>>> Stashed changes
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { useBuilderStore } from '@/store/builderStore';
import { dashboardService } from '@/services/dashboard';
import { formsService } from '@/services/forms';
import { dashboardKeys, workspaceKeys } from '@/lib/queryKeys';

export interface PersonalSidebarProps {
  collapsed?: boolean;
}

// Personal-context nav set. Originally scoped to A1.1's 4-item list (Home, My Forms, Templates,
// Create workspace) — corrected here to also carry the header context switcher (this file was
// built before any layout actually mounted it, so nothing wired a switcher into personal space
// at all; see the account-facing bug this fixes: a signed-in user had no discoverable path from
// Personal space into a workspace anywhere in the rendered UI) and the four top-level pages that
// still genuinely exist and work today — Responses, Analytics, Reports, Settings. A1.1's smaller
// item list is the eventual V2 design once those pages move to per-form drill-in / the account
// menu (CLAUDE.md V2 conventions), but that migration hasn't happened yet; dropping the links now
// would silently remove real, currently-reachable functionality. Kept until that migration lands.
//
// "Shared with me" (A3, -> C2.7) closed this sprint (requirements.md §7.9) — the /shared route
// and its data source (GET /api/shared-with-me) now exist, so it's a permanent item below,
// positioned right after "My Forms" per the wireframe's PERSONAL_NAV order. "My Submissions"
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

<<<<<<< Updated upstream
  const isResponsesActive =
    pathname.startsWith('/responses') || /^\/forms\/[^/]+\/responses(\/|$)/.test(pathname);
  const isAnalyticsActive =
    pathname.startsWith('/analytics') || /^\/forms\/[^/]+\/analytics(\/|$)/.test(pathname);
=======
  // Blue count on "Shared with me" while someone's share is unseen (cleared when that page is opened).
  const { data: sharedUnread = 0 } = useQuery({
    queryKey: notificationKeys.unreadOfType('personal', 'form_shared'),
    queryFn: () => notificationsService.unreadCount('personal', 'form_shared'),
    retry: false,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  // Responses owns the form-level data pages too (/forms/:id/inbox and /insights); Forms keeps the rest.
  const isFormDataRoute = /^\/forms\/[^/]+\/(inbox|insights)\/?$/.test(pathname);
  const isResponsesActive = isFormDataRoute || /^\/(form-responses|inbox)(\/|$)/.test(pathname);
  const isInsightsActive = /^\/insights(\/|$)/.test(pathname);
>>>>>>> Stashed changes

  return (
    <Sidebar
      collapsed={collapsed}
      header={<WorkspaceContextSwitcher currentLabel="Personal" collapsed={collapsed} />}
      groups={[
        {
          items: [
            { label: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard', onClick: guard('/dashboard') },
<<<<<<< Updated upstream
            { label: 'My Forms', href: '/forms', icon: FileText, active: pathname.startsWith('/forms') && !isInBuilder, onClick: guard('/forms') },
            { label: 'Shared with me', href: '/shared', icon: Share2, active: pathname.startsWith('/shared'), onClick: guard('/shared') },
=======
            { label: 'Forms', href: '/forms', icon: FileText, active: pathname.startsWith('/forms') && !isFormDataRoute, onClick: guard('/forms') },
            // Nothing to show until a form exists - hidden rather than left to render an empty state. Still shown
            // while loading (hasForms defaults true) and when deep-linked, so an active page never vanishes from its nav.
            ...(hasForms || isResponsesActive
              ? [{ label: 'Responses', href: '/form-responses', icon: Table2, active: isResponsesActive, onClick: guard('/form-responses') }]
              : []),
            ...(hasForms || isInsightsActive
              ? [{ label: 'Insights', href: '/insights', icon: BarChart3, active: isInsightsActive, onClick: guard('/insights') }]
              : []),
          ],
        },
        {
          label: 'Library',
          items: [
            { label: 'Shared with me', href: '/shared', icon: Share2, count: sharedUnread > 0 ? sharedUnread : undefined, active: pathname.startsWith('/shared'), onClick: guard('/shared') },
>>>>>>> Stashed changes
            { label: 'Templates', href: '/templates', icon: LayoutTemplate, active: pathname.startsWith('/templates'), onClick: guard('/templates') },
            // Responses/Analytics/Reports have nothing to show until a form exists — hidden
            // rather than left to render their own all-zero/empty state, same reasoning as the
            // dashboard's stat cards. Still shown while loading (hasForms defaults true) and if
            // the user is deep-linked onto one of them already, so an active page never vanishes
            // from its own nav.
            ...(hasForms || isResponsesActive
              ? [{ label: 'Responses', href: '/responses', icon: Table2, active: isResponsesActive, onClick: guard('/responses') }]
              : []),
            ...(hasForms || isAnalyticsActive
              ? [{ label: 'Analytics', href: '/analytics', icon: PieChart, active: isAnalyticsActive, onClick: guard('/analytics') }]
              : []),
            ...(hasForms || pathname.startsWith('/reports')
              ? [{ label: 'Reports', href: '/reports', icon: Download, active: pathname.startsWith('/reports'), onClick: guard('/reports') }]
              : []),
            { label: 'Settings', href: '/settings', icon: Settings, active: pathname.startsWith('/settings'), onClick: guard('/settings') },
          ],
        },
        {
          items: [
            {
              label: 'Create workspace',
              href: '/workspaces',
              icon: Plus,
              active: pathname.startsWith('/workspaces'),
              onClick: guard('/workspaces'),
            },
          ],
        },
      ]}
    />
  );
}
