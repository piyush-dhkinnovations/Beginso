'use client';

import { CHART_COLOR, ChartCard, DonutWithLegend, ProgressBars } from '@/components/ui/charts';

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
    { label: 'Published', value: count('published'), color: CHART_COLOR.primary },
    { label: 'Draft', value: count('draft'), color: CHART_COLOR.soft },
    { label: 'Closed', value: count('closed'), color: CHART_COLOR.warning },
  ].filter((s) => s.value > 0);

  const busiest = [...forms]
    .filter((f) => f.responses > 0)
    .sort((a, b) => b.responses - a.responses)
    .slice(0, TOP_FORMS)
    .map((f) => ({ label: f.title, value: f.responses }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Forms by status">
        <DonutWithLegend segments={segments} size={128} />
      </ChartCard>
      <ChartCard title="Responses by form">
        {busiest.length > 0 ? (
          <ProgressBars items={busiest} />
        ) : (
          <p className="bg-body-sm text-(--text-muted)">No responses yet — they will rank your forms here.</p>
        )}
      </ChartCard>
    </div>
  );
}
