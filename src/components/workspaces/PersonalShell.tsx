'use client';

// PersonalShell — the (user)/ route group's counterpart to WorkspaceShell.tsx. Same reason to
// exist: (user)/layout.tsx is a Server Component (reads the sidebar_collapsed cookie);
// AppShell's sidebar/topBar props are render-prop functions, which cannot cross the Server ->
// Client boundary, so this thin 'use client' wrapper owns those closures instead.

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
import { BUILDER_HEADER_SLOT_ID } from '@/lib/formHeaderSlot';

// The palette and its results code load after first paint, off the shell's critical path.
const GlobalSearch = dynamic(() => import('@/components/search/GlobalSearch').then((m) => m.GlobalSearch), { ssr: false });

export interface PersonalShellProps {
  initialCollapsed: boolean;
  children: React.ReactNode;
}

// A form's own detail routes (/forms/:id/edit, /overview, ...) all live under this (user)/
// route group regardless of which workspace actually owns the form — there is no parallel
// /w/[slug]/forms/:id/edit route (see FormRow: the builder link is always `/forms/${id}/edit`).
// Rendering PersonalSidebar/"Personal" for all of them would show the wrong context around a
// form that lives in a workspace. So: detect a form-detail route, look up that form's real
// workspace, and render the same WorkspaceSidebar/label the workspace's own pages use instead.
const FORM_DETAIL_ROUTE_RE = /^\/forms\/([^/]+)(?:\/|$)/;

// That lookup alone would flash the *wrong* sidebar for
// a couple of seconds on every navigation into a workspace form — `/w/[slug]/forms` and
// `/forms/:id/edit` sit under two different layouts, so crossing between them unmounts
// WorkspaceShell and mounts this shell fresh, `formWorkspace` starting at `undefined` again
// every time. Two things prevent that: (1) every link into a form's detail routes from a workspace
// page carries `?ws=<slug>` (see formHref in components/forms/formsListUtils.ts, and
// w/[slug]/page.tsx's own quick links) — a same-render synchronous hint that needs no fetch to
// resolve, since the previous page already knew its own workspace; (2) failing that hint, while
// resolving via the `form`/`workspaces` fetches, this renders a neutral loading
// sidebar instead of defaulting to PersonalSidebar — showing nothing definite beats showing the
// wrong thing.
function PersonalShellFrame({ initialCollapsed, children }: PersonalShellProps) {
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
  // personal, not a known workspace) — the window in which either sidebar could be the wrong
  // sidebar. Once `form` resolves (confirming a personal form, `workspaceId: null`) or a
  // workspace match lands, this clears immediately.
  // A workspace form's detail routes render under this shell, so search and notifications
  // follow the form's workspace, not 'personal'. While still resolving they stay personal.
  const contextScope = formWorkspace?.slug ?? 'personal';

  const contextUnresolved = !!formId && !wsHint && !form && !formWorkspace;

  // A form's Overview and Edit pages collapse the app sidebar to its icon rail for room; the menu button still expands it.
  const isFormFocus = /^\/forms\/[^/]+\/(overview|scores|edit)\/?$/.test(pathname);

  // The builder puts its form header in the top bar and lays its panels out edge to edge.
  // From 1024px that header takes the search button's place (Ctrl K / Cmd K still opens search).
  const isBuilder = /^\/forms\/[^/]+\/edit\/?$/.test(pathname);

  // Feed "recent forms" in the sidebar: record once the form's real scope is known (never guess 'personal' while resolving).
  const recentScope = formWorkspace?.slug ?? (form && !form.workspaceId ? 'personal' : undefined);
  const recentTitle = form?._id === formId ? form?.title : undefined;
  useEffect(() => {
    if (formId && recentScope && recentTitle) touchRecentForm(recentScope, { id: formId, title: recentTitle });
  }, [formId, recentScope, recentTitle]);

  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      forceCollapsed={isFormFocus}
      flush={isBuilder}
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
          center={isBuilder ? <div id={BUILDER_HEADER_SLOT_ID} className="flex min-w-0 flex-1 items-center" /> : undefined}
          actions={
            <div className="flex items-center gap-2">
              <span className={isBuilder ? 'contents lg:hidden' : 'contents'}>
                <SearchTrigger />
              </span>
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

/** The respondent view inside the Branding studio's frame and the layout preview: the form alone, in a document of its own. */
export const isEmbeddedPreview = (pathname: string, embed: string | null) => embed === '1' && /^\/forms\/[^/]+\/preview\/?$/.test(pathname);

/**
 * The page frame (sidebar, top bar, the "Personal" label) is for people moving around the app. The Branding studio shows the form in an
 * <iframe> of this very app, and with the frame around it the frame showed first: the app's own dashboard for a few seconds, then the form.
 * An embedded preview is therefore drawn with no frame at all, and does not fetch the form, the workspaces or anything else the frame needs.
 */
export function PersonalShell(props: PersonalShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // `?embed=1` is the studio's frame; `?bare=1` is its "Full screen" tab. Both are the form alone.
  const formOnly = searchParams.get('embed') === '1' || searchParams.get('bare') === '1';
  if (isEmbeddedPreview(pathname, formOnly ? '1' : null)) return <>{props.children}</>;
  return <PersonalShellFrame {...props} />;
}
