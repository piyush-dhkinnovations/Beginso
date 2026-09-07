'use client';

import { usePathname } from 'next/navigation';
import { Home, FileText, LayoutTemplate, Table2, PieChart, Download, Settings } from 'lucide-react';
import { Sidebar } from '@/components/ui/Sidebar';

export interface WorkspaceSidebarProps {
  slug: string;
  collapsed?: boolean;
}

// Workspace-context nav set (requirements.md §7.3). Same item vocabulary/icons as the legacy
// src/components/dashboard/Sidebar.tsx (V1, untouched this sprint — design.md §2), scoped under
// /w/[slug] instead of the flat (user)/ tree. Reads the active route via usePathname() itself,
// same reasoning as PersonalSidebar.
export function WorkspaceSidebar({ slug, collapsed = false }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const base = `/w/${slug}`;
  const items = [
    { label: 'Home', href: base, icon: Home },
    { label: 'Forms', href: `${base}/forms`, icon: FileText },
    { label: 'Templates', href: `${base}/templates`, icon: LayoutTemplate },
    { label: 'Responses', href: `${base}/responses`, icon: Table2 },
    { label: 'Analytics', href: `${base}/analytics`, icon: PieChart },
    { label: 'Reports', href: `${base}/reports`, icon: Download },
    { label: 'Settings', href: `${base}/settings`, icon: Settings },
  ];

  return (
    <Sidebar
      collapsed={collapsed}
      groups={[
        {
          items: items.map((item) => ({
            ...item,
            active: item.href === base ? pathname === base : pathname.startsWith(item.href),
          })),
        },
      ]}
    />
  );
}
