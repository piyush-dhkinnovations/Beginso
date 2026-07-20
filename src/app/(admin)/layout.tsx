import { cookies } from 'next/headers';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

// Server Component layout — no 'use client' needed here.
// All interactive sidebar/topnav logic is in DashboardShell (client component).
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get('sidebar_collapsed')?.value === 'true';

  return <DashboardShell initialCollapsed={initialCollapsed}>{children}</DashboardShell>;
}
