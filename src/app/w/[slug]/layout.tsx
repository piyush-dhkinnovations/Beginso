import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { WorkspaceShell } from '@/components/workspaces/WorkspaceShell';
import { WorkspaceAccessDenied } from '@/components/workspaces/WorkspaceAccessDenied';
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
  if (!result.ok) return <WorkspaceAccessDenied />;

  const { workspace } = result;

  return (
    <WorkspaceShell
      slug={slug}
      workspaceName={workspace.name}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </WorkspaceShell>
  );
}

