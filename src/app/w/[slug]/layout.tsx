import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { WorkspaceShell } from '@/components/workspaces/WorkspaceShell';
import { WorkspaceAccessDenied } from '@/components/workspaces/WorkspaceAccessDenied';
import { WorkspaceLoadError } from '@/components/workspaces/WorkspaceLoadError';
import { resolveWorkspaceBySlug } from '@/lib/workspaceServer';
import { SESSION_COOKIE_NAME } from '@/lib/sessionCookie';

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

// Server Component — resolves the slug and checks membership before anything paints, so a
// non-member never sees a flash of the shell around an access-denied message
// (requirements.md §7.1, design.md §17). The membership check here is a UX convenience only;
// the real authorization boundary is the backend endpoint itself (requirements.md §14) — this
// layout does not, and cannot, substitute for that.
//
// notFound() fires only on a confirmed 404 from the backend — a genuinely nonexistent
// workspace. Any other lookup failure (403, or an 'error' status covering network faults,
// non-2xx responses, and unexpected payloads) renders its own recoverable state instead;
// collapsing those into notFound() previously meant a transient backend hiccup permanently
// 404'd a real workspace (see workspaceServer.ts's resolveWorkspaceBySlug()).
//
// WHY WorkspaceShell (not AppShell directly):
// AppShell's topBar/sidebar props are render-prop *functions* — React cannot serialise
// functions across the RSC boundary (Server → Client Component), which caused a 500 error.
// WorkspaceShell is a 'use client' wrapper that owns those closures client-side; this layout
// passes only plain serialisable values (slug, workspaceName, initialCollapsed).
export default async function WorkspaceLayout({ children, params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get('sidebar_collapsed')?.value === 'true';
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  const result = await resolveWorkspaceBySlug(slug, token);
  if (!result.ok && result.status === 404) notFound();
  if (!result.ok && result.status === 403) return <WorkspaceAccessDenied />;
  if (!result.ok) return <WorkspaceLoadError />;

  const { workspace, role } = result;

  // role is undefined until BE 0.1 ships (sprint-9-team-permissions, requirements.md §8.7) —
  // WorkspaceSidebar/WorkspaceShell treat an unknown role as "hide the role-gated nav item,"
  // never "show it," since the real permission boundary is server-side regardless.
  return (
    <WorkspaceShell
      slug={slug}
      workspaceName={workspace.name}
      initialCollapsed={initialCollapsed}
      role={role}
    >
      {children}
    </WorkspaceShell>
  );
}

