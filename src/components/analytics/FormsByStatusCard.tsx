'use client';

import { PieChart } from 'lucide-react';
import { ChartCard, PieChart as DonutChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import { EmptyState } from '@/components/ui/EmptyState';

export interface FormsByStatusCardProps {
  counts: { published: number; draft: number; closed: number };
  isLoading: boolean;
}

// Donut of forms by status with counts and shares (Published / Draft / Closed).
export function FormsByStatusCard({ counts, isLoading }: FormsByStatusCardProps) {
  const segments = [
    { label: 'Published', value: counts.published },
    { label: 'Draft', value: counts.draft },
    { label: 'Closed', value: counts.closed },
  ].filter((s) => s.value > 0);
  return (
    <ChartCard title="Forms by status">
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-(--bg-sunken)" />
      ) : segments.length === 0 ? (
        <EmptyState icon={<PieChart />} title="No forms yet" />
      ) : (
        <DonutChart donut data={toSegments(segments)} ariaLabel="Forms by status" centreLabel={String(counts.published + counts.draft + counts.closed)} />
      )}
    </ChartCard>
  );
}
