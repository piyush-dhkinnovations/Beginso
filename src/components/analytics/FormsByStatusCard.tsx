'use client';

import { PieChart } from 'lucide-react';
import { CHART_COLOR, ChartCard, DonutWithLegend } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/EmptyState';

export interface FormsByStatusCardProps {
  counts: { published: number; draft: number; closed: number };
  isLoading: boolean;
}

// Donut of forms by status with counts and shares (Published / Draft / Closed).
export function FormsByStatusCard({ counts, isLoading }: FormsByStatusCardProps) {
  const segments = [
    { label: 'Published', value: counts.published, color: CHART_COLOR.primary },
    { label: 'Draft', value: counts.draft, color: CHART_COLOR.soft },
    { label: 'Closed', value: counts.closed, color: CHART_COLOR.warning },
  ].filter((s) => s.value > 0);
  return (
    <ChartCard title="Forms by status">
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-(--bg-sunken)" />
      ) : segments.length === 0 ? (
        <EmptyState icon={<PieChart />} title="No forms yet" />
      ) : (
        <DonutWithLegend segments={segments} size={140} percent />
      )}
    </ChartCard>
  );
}
