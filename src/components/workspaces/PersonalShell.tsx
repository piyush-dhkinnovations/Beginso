'use client';

// PersonalShell — the (user)/ route group's counterpart to WorkspaceShell.tsx. Same reason to
// exist: (user)/layout.tsx is a Server Component (reads the sidebar_collapsed cookie);
// AppShell's sidebar/topBar props are render-prop functions, which cannot cross the Server ->
// Client boundary, so this thin 'use client' wrapper owns those closures instead.
//
// Replaces DashboardShell (src/components/dashboard/DashboardShell.tsx) as what (user)/layout.tsx
// renders. DashboardShell is left in place, unused, rather than deleted — same precedent Sprint 7
// set leaving AppShell/Sidebar/TopBar unused until Sprint 8 adopted them, just in the opposite
// direction now. NotificationBell/UserProfileDropdown are reused as-is; they were always
// self-contained dropdown triggers with no positioning dependency on the old fixed TopNav.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell, TopBar } from '@/components/ui';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { Wordmark } from '@/components/landing/Wordmark';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

export interface PersonalShellProps {
  initialCollapsed: boolean;
  children: React.ReactNode;
}

// A form's own detail routes (/forms/:id/edit, /overview, ...) all live under this (user)/
// route group regardless of which workspace actually owns the form — there is no parallel
// /w/[slug]/forms/:id/edit route (see FormRow: the builder link is always `/forms/${id}/edit`).
// Real bug found and fixed: this shell always rendered PersonalSidebar/"Personal" here, so
// editing a workspace-owned form showed the wrong context in the chrome even though the form
// itself lives in that workspace. Detect a form-detail route, look up that form's real
// workspace, and render the same WorkspaceSidebar/label the workspace's own pages use instead.
const FORM_DETAIL_ROUTE_RE = /^\/forms\/([^/]+)(?:\/|$)/;

export function PersonalShell({ initialCollapsed, children }: PersonalShellProps) {
  const pathname = usePathname();
  const formId = FORM_DETAIL_ROUTE_RE.exec(pathname)?.[1];

  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: !!form?.workspaceId,
  });

  const formWorkspace = form?.workspaceId
    ? workspaces.find((ws) => ws.id === form.workspaceId)
    : undefined;

  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      topBar={(toggleCollapsed, toggleMobile) => (
        <TopBar
          brand={
            <Link href="/dashboard" className="hover:opacity-90 transition-opacity">
              <Wordmark height={32} />
            </Link>
          }
          onMenuClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              toggleMobile?.();
            } else {
              toggleCollapsed();
            }
          }}
          actions={
            <div className="flex items-center gap-2">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          }
        />
      )}
      sidebar={(collapsed) =>
        formWorkspace ? (
          <WorkspaceSidebar
            slug={formWorkspace.slug}
            currentLabel={formWorkspace.name}
            collapsed={collapsed}
            role={formWorkspace.role}
          />
        ) : (
          <PersonalSidebar collapsed={collapsed} />
        )
      }
    >
      {children}
    </AppShell>
  );
}
