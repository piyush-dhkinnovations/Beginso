'use client';

import { BarsChart, ChartCard, PieChart as DonutChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';

export interface FormsOverviewChartsItem {
  title: string;
  status: 'draft' | 'published' | 'closed';
  responses: number;
}

const TOP_FORMS = 5;

/**
 * Two cards that answer "how are my forms doing?" from data every forms list already carries: a
 * donut of forms by status, and horizontal bars of the busiest forms by response count. Renders
 * nothing for an empty list (a first-run page shows its own empty state instead of empty charts).
 */
export function FormsOverviewCharts({ forms }: { forms: FormsOverviewChartsItem[] }) {
  if (forms.length === 0) return null;

  const count = (status: FormsOverviewChartsItem['status']) => forms.filter((f) => f.status === status).length;
  const segments = [
    { label: 'Published', value: count('published') },
    { label: 'Draft', value: count('draft') },
    { label: 'Closed', value: count('closed') },
  ].filter((s) => s.value > 0);

  const busiest = [...forms]
    .filter((f) => f.responses > 0)
    .sort((a, b) => b.responses - a.responses)
    .slice(0, TOP_FORMS)
    .map((f) => ({ label: f.title, value: f.responses }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Forms by status">
        <DonutChart donut data={toSegments(segments)} ariaLabel="Forms by status" centreLabel={String(forms.length)} />
      </ChartCard>
      <ChartCard title="Responses by form">
        {busiest.length > 0 ? (
          <BarsChart horizontal data={toSegments(busiest)} ariaLabel="Responses by form" />
        ) : (
          <p className="bg-body-sm text-(--text-muted)">No responses yet — they will rank your forms here.</p>
        )}
      </ChartCard>
    </div>
  );
}
