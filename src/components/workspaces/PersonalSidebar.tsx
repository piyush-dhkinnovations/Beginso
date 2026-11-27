'use client';

import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { POLL_MS } from '@/hooks/useUnreadCount';
import { Home, FileText, LayoutTemplate, Table2, BarChart3, Settings, Plus, Share2, Trash2, ClipboardList, Download } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { useBuilderStore } from '@/store/builderStore';
import { formsService } from '@/services/forms';
import { notificationKeys, workspaceKeys } from '@/lib/queryKeys';
import { notificationsService } from '@/services/notifications';
import { StorageUsage } from '@/components/workspaces/StorageUsage';

export interface PersonalSidebarProps {
  collapsed?: boolean;
}

// Personal-context nav set. It carries the header context switcher (without it a signed-in user has no
// discoverable path from Personal space into a workspace) and the top-level pages below.
export function PersonalSidebar({ collapsed = false }: PersonalSidebarProps) {
  const pathname = usePathname();
  const dirty = useBuilderStore((state) => state.dirty);
  const setPendingLeaveUrl = useBuilderStore((state) => state.setPendingLeaveUrl);
  // This sidebar only ever renders inside the already auth-protected (user)/ layout, so no separate
  // auth gate is needed here. Defaults to "has forms" (item shown) until we actually know otherwise,
  // so nav items don't flash hidden-then-visible while this loads.
  // `formsService.getForms` filters out any workspace-owned form (see its own comment), so its
  // (small, cheap) count is the only source here. The dashboard analytics aggregate is not fetched
  // for this one flag: it would be one extra request on every page.
  const { data: personalForms } = useQuery({
    queryKey: workspaceKeys.forms({ type: 'personal' }, { page: 1, limit: 1 }),
    queryFn: () => formsService.getForms({ page: 1, limit: 1 }, { type: 'personal' }),
  });
  const hasForms = personalForms ? personalForms.total > 0 : true;
  // Unsaved-changes guard: it must be preserved by
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
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  // Responses owns the form-level data pages too (/forms/:id/inbox and /insights); Forms keeps the rest.
  const isFormDataRoute = /^\/forms\/[^/]+\/(inbox|insights)\/?$/.test(pathname);
  const isResponsesActive = isFormDataRoute || /^\/(form-responses|inbox)(\/|$)/.test(pathname);
  const isInsightsActive = /^\/insights(\/|$)/.test(pathname);

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
            ...(hasForms || isInsightsActive
              ? [{ label: 'Insights', href: '/insights', icon: BarChart3, active: isInsightsActive, onClick: guard('/insights') }]
              : []),
          ],
        },
        {
          label: 'Library',
          items: [
            { label: 'Shared with me', href: '/shared', icon: Share2, count: sharedUnread > 0 ? sharedUnread : undefined, countLabel: 'new', active: pathname.startsWith('/shared'), onClick: guard('/shared') },
            { label: 'Templates', href: '/templates', icon: LayoutTemplate, active: pathname.startsWith('/templates'), onClick: guard('/templates') },
            // Wireframe 31: always in the personal nav (an empty state explains it).
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
