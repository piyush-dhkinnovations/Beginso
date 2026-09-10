'use client';

// WorkspaceShell — a thin 'use client' wrapper that owns the AppShell render-prop
// closures for the /w/[slug] route group.
//
// WHY THIS EXISTS:
// WorkspaceLayout is a Server Component (it reads cookies + resolves the slug via a
// server-side fetch). AppShell is a Client Component. React's RSC serialisation boundary
// means you can pass *data* (strings, numbers, plain objects) from a Server Component to
// a Client Component, but *functions* are not serialisable and will throw:
//   "Functions cannot be passed directly to Client Components unless you explicitly
//    expose it by marking it with 'use server'."
// The render-prop pattern (topBar/sidebar as arrow functions) crosses that boundary in the
// original layout — this wrapper moves the closures client-side, where they are legal.
//
// The layout now passes only serialisable props (slug, workspaceName, initialCollapsed)
// and WorkspaceShell owns the function values internally.

import Link from 'next/link';
import { AppShell, TopBar } from '@/components/ui';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import type { Role } from '@/types/workspace';

export interface WorkspaceShellProps {
  slug: string;
  workspaceName: string;
  initialCollapsed: boolean;
  children: React.ReactNode;
  // Sprint 9 (team-permissions) — undefined until BE 0.1 ships; WorkspaceSidebar fails closed
  // (hides role-gated items) when this is undefined, per workspaceServer.ts's own comment.
  role?: Role;
}

export function WorkspaceShell({ slug, workspaceName, initialCollapsed, children, role }: WorkspaceShellProps) {
  return (
    <AppShell
      initialCollapsed={initialCollapsed}
      topBar={(toggleCollapsed, toggleMobile) => (
        <TopBar
          brand={
            <Link href="/dashboard" className="hover:opacity-90 transition-opacity">
              <span>Beginso</span>
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
      sidebar={(collapsed) => (
        <WorkspaceSidebar slug={slug} currentLabel={workspaceName} collapsed={collapsed} role={role} />
      )}
    >
      {children}
    </AppShell>
  );
}
