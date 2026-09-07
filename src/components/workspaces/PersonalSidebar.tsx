'use client';

import { usePathname } from 'next/navigation';
import { Home, FileText, Building2 } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

export interface PersonalSidebarProps {
  collapsed?: boolean;
}

// Personal-context nav set (requirements.md §7.3, C1.1). "My Submissions" (A5.1) is deliberately
// NOT included here — requirements.md named it a nav "placeholder", but no /submissions route
// exists yet (the respondent portal itself is Sprint 13, requirements.md §3 non-goal) and
// ui/Sidebar's items are always real links, so including it would ship a dead 404 link rather
// than a genuine placeholder. Add it back when Sprint 13 builds the route it points to.
//
// Reads the active route from usePathname() itself (matching the legacy
// src/components/dashboard/Sidebar.tsx's own pattern) rather than taking it as a prop — the
// consuming server layout (src/app/w/[slug]/layout.tsx has the equivalent) has no easy access to
// the current pathname without duplicating that plumbing.
export function PersonalSidebar({ collapsed = false }: PersonalSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsed={collapsed}
      groups={[
        {
          items: [
            { label: 'Home', href: '/dashboard', icon: Home, active: pathname === '/dashboard' },
            { label: 'My Forms', href: '/forms', icon: FileText, active: pathname.startsWith('/forms') },
            {
              label: 'All Workspaces',
              href: '/workspaces',
              icon: Building2,
              active: pathname.startsWith('/workspaces'),
            },
          ],
        },
      ]}
    />
  );
}
