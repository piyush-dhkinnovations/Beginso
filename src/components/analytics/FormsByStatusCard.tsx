'use client';

import { PieChart } from 'lucide-react';
import { ChartCard, PieChart as DonutChart } from '@/components/ui/charts';
import { FORM_STATUS_COLOR } from '@/lib/statusColors';
import { toSegments } from '@/lib/chartSegments';
import { EmptyState } from '@/components/ui/EmptyState';

export interface FormsByStatusCardProps {
  counts: { published: number; draft: number; closed: number };
  isLoading: boolean;
}

// Forms by status (Published / Draft / Closed). With 2-3 categories a donut would print the same total twice, so
// this is a single stacked bar with a legend that carries the counts. This is the only place the breakdown lives.
export function FormsByStatusCard({ counts, isLoading }: FormsByStatusCardProps) {
  const all = [
    { label: 'Published', value: counts.published, color: FORM_STATUS_COLOR.published },
    { label: 'Draft', value: counts.draft, color: FORM_STATUS_COLOR.draft },
    { label: 'Closed', value: counts.closed, color: FORM_STATUS_COLOR.closed },
  ];
  const segments = all.filter((s) => s.value > 0);
  const total = counts.published + counts.draft + counts.closed;
  return (
    <ChartCard title="Forms by status">
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-(--bg-sunken)" />
      ) : segments.length === 0 ? (
        <EmptyState icon={<PieChart />} title="No forms yet" />
      ) : segments.length > 3 ? (
        <DonutChart donut data={toSegments(segments)} ariaLabel="Forms by status" centreLabel="forms" />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="bg-body-sm text-(--text-muted)">
            <span className="text-2xl font-bold tabular-nums text-(--text-primary)">{total}</span> {total === 1 ? 'form' : 'forms'}
          </p>
          <div
            role="img"
            aria-label={`Forms by status: ${all.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}`}
            className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full"
          >
            {all.map((s) =>
              s.value > 0 ? <span key={s.label} style={{ flexGrow: s.value, backgroundColor: s.color }} /> : null,
            )}
          </div>
          <ul className="flex flex-col gap-2">
            {all.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 bg-body-sm text-(--text-secondary)">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-(--text-primary)">
                  {s.value} <span className="font-normal text-(--text-muted)">({Math.round((s.value / total) * 100)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
