import { ReportsView } from '@/components/reports/ReportsView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Exports: CSV / PDF export jobs for THIS workspace's forms (scope = slug).
export default async function WorkspaceExportsPage({ params }: Props) {
  const { slug } = await params;
  return <ReportsView scope={slug} />;
}
