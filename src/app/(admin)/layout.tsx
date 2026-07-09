import { DashboardShell } from '@/components/dashboard/DashboardShell';

// Server Component layout — no 'use client' needed here.
// All interactive sidebar/topnav logic is in DashboardShell (client component).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
