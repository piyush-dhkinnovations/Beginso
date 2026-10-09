import { notFound } from 'next/navigation';
import { DashboardDemo } from '@/components/dashboard-grid/DashboardDemo';

// Design preview, not a shipped page — non-production only, like /dev/ui.
export default function DashboardDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DashboardDemo />;
}
