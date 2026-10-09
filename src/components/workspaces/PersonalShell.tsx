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
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { removeRecentForm, touchRecentForm } from '@/store/recentFormsStore';
import { SearchTrigger } from '@/components/search/SearchTrigger';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { AppShell, TopBar, Skeleton } from '@/components/ui';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { Wordmark } from '@/components/landing/Wordmark';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

// Sprint 14 (task 6.3): the palette and its results code load after first paint, off the shell's critical path.
const GlobalSearch = dynamic(() => import('@/components/search/GlobalSearch').then((m) => m.GlobalSearch), { ssr: false });

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

// Real bug found and fixed (round 2): the first fix above still flashed the *wrong* sidebar for
// a couple of seconds on every navigation into a workspace form — `/w/[slug]/forms` and
// `/forms/:id/edit` sit under two different layouts, so crossing between them unmounts
// WorkspaceShell and mounts this shell fresh, `formWorkspace` starting at `undefined` again
// every time. Two fixes, not one: (1) every link into a form's detail routes from a workspace
// page now carries `?ws=<slug>` (see FormsManagerTabs consumer in forms/page.tsx, and
// w/[slug]/page.tsx's own quick links) — a same-render synchronous hint that needs no fetch to
// resolve, since the previous page already knew its own workspace; (2) failing that hint, while
// still resolving via the `form`/`workspaces` fetches, this now renders a neutral loading
// sidebar instead of defaulting to PersonalSidebar — showing nothing definite beats showing the
// wrong thing.
export function PersonalShell({ initialCollapsed, children }: PersonalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formId = FORM_DETAIL_ROUTE_RE.exec(pathname)?.[1];
  const wsHint = searchParams.get('ws');

  const { data: form, error: formError } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  // A form this account cannot open (no access / deleted) must not stay in its sidebar list.
  const formErrorStatus = isAxiosError(formError) ? formError.response?.status : undefined;
  useEffect(() => {
    if (formId && (formErrorStatus === 403 || formErrorStatus === 404)) removeRecentForm(formId);
  }, [formId, formErrorStatus]);

  // Unconditional (not gated on form.workspaceId) so it fetches in parallel with `form` above
  // rather than waiting on it — and it's usually already warm anyway, since every sidebar's own
  // WorkspaceContextSwitcher fetches this identical query key on mount.
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: !!formId,
  });

  const formWorkspace = wsHint
    ? workspaces.find((ws) => ws.slug === wsHint)
    : form?.workspaceId
      ? workspaces.find((ws) => ws.id === form.workspaceId)
      : undefined;

  // True only on a form-detail route where we haven't yet resolved *either* answer (not
  // personal, not a known workspace) — the window this shell used to fill with the wrong
  // sidebar. Once `form` resolves (confirming a personal form, `workspaceId: null`) or a
  // workspace match lands, this clears immediately.
  // Sprint 14: a workspace form's detail routes render under this shell, so search and notifications
  // follow the form's workspace, not 'personal'. While still resolving they stay personal.
  const contextScope = formWorkspace?.slug ?? 'personal';

  const contextUnresolved = !!formId && !wsHint && !form && !formWorkspace;

  // The form's own pages are a focus view: no docked sidebar (the menu button still opens it as a drawer).
  // The builder is included: it shows the same form sub-nav, so moving between a form's pages feels like one place.
  const isFormFocus = /^\/forms\/[^/]+\/(overview|inbox|insights|scores|edit)\/?$/.test(pathname);

  // Feed "recent forms" in the sidebar: record once the form's real scope is known (never guess 'personal' while resolving).
  const recentScope = formWorkspace?.slug ?? (form && !form.workspaceId ? 'personal' : undefined);
  const recentTitle = form?._id === formId ? form?.title : undefined;
  useEffect(() => {
    if (formId && recentScope && recentTitle) touchRecentForm(recentScope, { id: formId, title: recentTitle });
  }, [formId, recentScope, recentTitle]);

  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      hideSidebar={isFormFocus}
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
              <SearchTrigger />
              <NotificationBell scope={contextScope} />
              <UserProfileDropdown />
              <GlobalSearch key={contextScope} scope={contextScope} />
            </div>
          }
        />
      )}
      sidebar={(collapsed) =>
        formWorkspace ? (
          // A form's pages keep the workspace sidebar; the form's own nav is the horizontal sub-nav
          // (forms/[id]/layout.tsx), never a replacement sidebar.
          <WorkspaceSidebar
            slug={formWorkspace.slug}
            currentLabel={formWorkspace.name}
            collapsed={collapsed}
            role={formWorkspace.role}
            formContext={!!formId}
          />
        ) : contextUnresolved ? (
          // Not built from Sidebar/groups — that component always renders each item as a real
          // <Link>, which isn't right for placeholder rows with nowhere to go yet.
          <nav className={collapsed ? 'bg-sidenav bg-sidenav-rail' : 'bg-sidenav'} aria-label="Loading navigation">
            <div className={collapsed ? 'w-full flex justify-center mb-2 px-1' : 'w-full mb-2.5 pb-2.5 border-b border-(--border-default)/60'}>
              <Skeleton variant="text" width={collapsed ? 32 : '70%'} height={32} />
            </div>
            <div className="flex flex-col gap-3 px-1 pt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="text" width={collapsed ? 24 : '80%'} height={20} />
              ))}
            </div>
          </nav>
        ) : (
          <PersonalSidebar collapsed={collapsed} />
        )
      }
    >
      {children}
    </AppShell>
  );
}
