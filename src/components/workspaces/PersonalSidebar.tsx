'use client';

import { usePathname } from 'next/navigation';
import { Home, FileText, LayoutTemplate, Table2, PieChart, Download, Settings, Plus, Share2 } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { useBuilderStore } from '@/store/builderStore';

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

  const isResponsesActive =
    pathname.startsWith('/responses') || /^\/forms\/[^/]+\/responses(\/|$)/.test(pathname);
  const isAnalyticsActive =
    pathname.startsWith('/analytics') || /^\/forms\/[^/]+\/analytics(\/|$)/.test(pathname);

  return (
    <Sidebar
      collapsed={collapsed}
      header={<WorkspaceContextSwitcher currentLabel="Personal" collapsed={collapsed} />}
      groups={[
        {
          items: [
            { label: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard', onClick: guard('/dashboard') },
            { label: 'My Forms', href: '/forms', icon: FileText, active: pathname.startsWith('/forms') && !isInBuilder, onClick: guard('/forms') },
            { label: 'Shared with me', href: '/shared', icon: Share2, active: pathname.startsWith('/shared'), onClick: guard('/shared') },
            { label: 'Templates', href: '/templates', icon: LayoutTemplate, active: pathname.startsWith('/templates'), onClick: guard('/templates') },
            { label: 'Responses', href: '/responses', icon: Table2, active: isResponsesActive, onClick: guard('/responses') },
            { label: 'Analytics', href: '/analytics', icon: PieChart, active: isAnalyticsActive, onClick: guard('/analytics') },
            { label: 'Reports', href: '/reports', icon: Download, active: pathname.startsWith('/reports'), onClick: guard('/reports') },
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
