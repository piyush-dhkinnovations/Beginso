'use client';

import Link from 'next/link';
import { BarsChart, ChartCard } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';

export interface FormsOverviewChartsItem {
  title: string;
  status: 'draft' | 'published' | 'closed';
  responses: number;
}

const TOP_FORMS = 5;

/**
 * "Responses by form" for the busiest forms, from data every forms list already carries. "Forms by status"
 * lives on Insights only (one number, one home) - this card links there instead of repeating it. Renders
 * nothing for an empty list (a first-run page shows its own empty state instead of empty charts).
 */
export function FormsOverviewCharts({ forms, insightsHref }: { forms: FormsOverviewChartsItem[]; insightsHref: string }) {
  if (forms.length === 0) return null;

  const busiest = [...forms]
    .filter((f) => f.responses > 0)
    .sort((a, b) => b.responses - a.responses)
    .slice(0, TOP_FORMS)
    .map((f) => ({ label: f.title, value: f.responses }));

  return (
    <ChartCard title="Responses by form">
      {busiest.length > 0 ? (
        <BarsChart horizontal data={toSegments(busiest)} ariaLabel="Responses by form" />
      ) : (
        <p className="bg-body-sm text-(--text-muted)">No responses yet — they will rank your forms here.</p>
      )}
      <Link href={insightsHref} className="mt-3 inline-flex min-h-11 items-center bg-body-sm font-semibold text-(--text-link) hover:text-(--accent-soft-text)">
        See forms by status in Insights
      </Link>
    </ChartCard>
  );
}
