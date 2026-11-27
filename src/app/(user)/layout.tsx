import { cookies } from 'next/headers';
import { PersonalShell } from '@/components/workspaces/PersonalShell';

// Server Component layout — no 'use client' needed here.
// All interactive sidebar/topnav logic is in PersonalShell (client component), which composes
// the V2 AppShell/PersonalSidebar/ContextSwitcher primitives — same pattern as
// src/app/w/[slug]/layout.tsx's WorkspaceShell.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get('sidebar_collapsed')?.value === 'true';

  return <PersonalShell initialCollapsed={initialCollapsed}>{children}</PersonalShell>;
}
