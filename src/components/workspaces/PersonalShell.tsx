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
import { AppShell, TopBar } from '@/components/ui';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';
import { Wordmark } from '@/components/landing/Wordmark';

export interface PersonalShellProps {
  initialCollapsed: boolean;
  children: React.ReactNode;
}

export function PersonalShell({ initialCollapsed, children }: PersonalShellProps) {
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
      sidebar={(collapsed) => <PersonalSidebar collapsed={collapsed} />}
    >
      {children}
    </AppShell>
  );
}
