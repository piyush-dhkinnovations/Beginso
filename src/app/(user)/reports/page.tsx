import { redirect } from 'next/navigation';

// Sprint 14 (requirements 1.1): Reports folded into Insights as the Exports tab. The route stays as
// a redirect so old bookmarks and links keep working.
export default function ReportsPage() {
  redirect('/analytics?tab=exports');
}
