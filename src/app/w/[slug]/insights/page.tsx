import { AnalyticsView } from '@/components/analytics/AnalyticsView';

interface Props {
  params: Promise<{ slug: string }>;
}

// Workspace Insights: the workspace-wide analytics (summary cards, responses over time, forms by status and the
// per-form table), scoped to THIS workspace through x-workspace-slug. Per-form drill-in goes to
// /forms/:id/analytics?ws=<slug> so the workspace sidebar stays in place.
export default async function WorkspaceInsightsPage({ params }: Props) {
  const { slug } = await params;
  return <AnalyticsView scope={slug} title="Insights" />;
}
