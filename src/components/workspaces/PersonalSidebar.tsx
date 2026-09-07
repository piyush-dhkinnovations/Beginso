'use client';

import { usePathname } from 'next/navigation';
import { Home, FileText, LayoutTemplate, Plus } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

export interface PersonalSidebarProps {
  collapsed?: boolean;
}

// Personal-context nav set — corrected Day 3 against the master feature list's actual A1.1
// ("Personal sidebar (4 items + Create workspace): Home, My Forms, Shared with me, Templates,
// My Submissions") and A1.3 ("Create workspace — bottom placement, own divider... a once-ever
// action doesn't need to be paid for on every visit"). An earlier draft of this component invented
// an "All Workspaces" main-nav item and omitted Templates entirely — see requirements.md §7.3's
// Day 3 correction.
//
// Two real, tracked gaps against A1.1's full item list, both deliberate (requirements.md §3
// non-goals), not silently dropped:
// - "Shared with me" (A3, decided permanent item) surfaces per-form grants (A3.3 -> C2.7), which
//   don't exist until Sprint 9 — nothing to link to yet.
// - "My Submissions" (A5.1) has no route until the respondent portal, Sprint 13.
//
// "Create workspace" is a second, unlabeled nav group rather than a true bottom-pinned item with
// a divider line — beginso-ui.css's sidenav section (§12) has no divider primitive yet
// (checked directly), and building one is a visual-polish item smaller than this sprint's actual
// scope, not a functional gap.
//
// Reads the active route from usePathname() itself (matching the legacy
// src/components/dashboard/Sidebar.tsx's own pattern) rather than taking it as a prop — the
// consuming server layout has no easy access to the current pathname without duplicating that
// plumbing.
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
              label: 'Templates',
              href: '/templates',
              icon: LayoutTemplate,
              active: pathname.startsWith('/templates'),
            },
          ],
        },
        {
          items: [
            {
              label: 'Create workspace',
              href: '/workspaces',
              icon: Plus,
              active: pathname.startsWith('/workspaces'),
            },
          ],
        },
      ]}
    />
  );
}
