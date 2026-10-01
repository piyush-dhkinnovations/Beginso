'use client';

import { BarChart3 } from 'lucide-react';
import { BarChart, ChartCard } from '@/components/ui/charts';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import type { AnalyticsTrendPoint } from '@/types/analytics';

export type TrendBucket = 'day' | 'week';

const label = (bucketStart: string, bucket: TrendBucket) => {
  const d = new Date(bucketStart);
  // "03 Sep" — built from parts because the en-GB locale spells September "Sept".
  const text = `${String(d.getUTCDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}`;
  return bucket === 'week' ? `Wk ${text}` : text;
};

interface ResponsesOverTimeCardProps {
  points?: AnalyticsTrendPoint[];
  isLoading: boolean;
  bucket: TrendBucket;
  onBucketChange: (bucket: TrendBucket) => void;
}

// Responses per day/week across all forms as a bar chart (peak highlighted), with a Daily/Weekly
// switch. A visually-hidden table carries the exact figures for assistive tech.
export function ResponsesOverTimeCard({ points, isLoading, bucket, onBucketChange }: ResponsesOverTimeCardProps) {
  const data = (points ?? []).map((p) => ({ label: label(p.bucketStart, bucket), value: p.responses }));
  return (
    <ChartCard
      title="Responses over time"
      legend={
        <div className="w-32">
          <Select id="trend-bucket" aria-label="Group responses by" value={bucket} onChange={(e) => onBucketChange(e.target.value as TrendBucket)}>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="h-52 animate-pulse rounded-lg bg-(--bg-sunken)" />
      ) : data.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No trend yet" description="Daily responses will chart here once forms start receiving submissions in this range." />
      ) : (
        <>
          <BarChart data={data} height={210} ariaLabel="Responses over time" />
          <table className="sr-only">
            <caption>Responses per {bucket}</caption>
            <thead>
              <tr><th>Period</th><th>Responses</th></tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={`${d.label}-${i}`}><td>{d.label}</td><td>{d.value}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </ChartCard>
  );
}
