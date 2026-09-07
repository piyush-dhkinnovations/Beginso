import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { AppShell, TopBar, ContextSwitcher } from '@/components/ui';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
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
// Real switching logic for ContextSwitcher (the workspace list, onSelect) is Sprint 8 Tuesday's
// scope (requirements.md §7.2) — today it renders with just this workspace's name, same
// no-props-safe default Sprint 7 already built it for.
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
    <AppShell
      initialCollapsed={initialCollapsed}
      topBar={(toggleCollapsed) => (
        <TopBar
          brand={<span>Beginso</span>}
          onMenuClick={toggleCollapsed}
          actions={<ContextSwitcher currentLabel={workspace.name} />}
        />
      )}
      sidebar={(collapsed) => <WorkspaceSidebar slug={slug} collapsed={collapsed} />}
    >
      {children}
    </AppShell>
  );
}
