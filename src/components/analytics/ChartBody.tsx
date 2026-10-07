'use client';

import { AlertCircle, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ChartView, type DrillTarget } from './ChartView';
import type { ChartDefinition, FieldBucket } from '@/types/charts';
import type { FormField } from '@/types/form';

interface QueryLike {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  data?: FieldBucket[];
  refetch: () => unknown;
}

/** Loading / permission / error+Retry / empty / chart - the same five states for a card, the preview and full screen. */
export function ChartBody({
  def,
  field,
  query,
  onSelect,
  height,
  skeletonHeight = 200,
}: {
  def: Pick<ChartDefinition, 'type' | 'options' | 'title'>;
  field?: FormField;
  query: QueryLike;
  onSelect?: (t: DrillTarget) => void;
  height?: number;
  skeletonHeight?: number;
}) {
  if (query.isLoading) return <Skeleton variant="block" height={skeletonHeight} className="w-full rounded-lg" aria-busy="true" />;
  if (query.isError) {
    const status = isAxiosError(query.error) ? query.error.response?.status : undefined;
    return status === 403 ? (
      <EmptyState icon={<LockKeyhole />} title="No access" description="You don't have permission to view this chart's data." />
    ) : (
      <EmptyState
        icon={<AlertCircle />}
        title="Unable to load this chart"
        actions={<Button variant="secondary" size="small" onClick={() => void query.refetch()}>Try again</Button>}
      />
    );
  }
  const buckets = query.data ?? [];
  if (!buckets.some((b) => b.count > 0)) {
    return <p className="bg-body-sm text-(--text-muted)">No answers in this range.</p>;
  }
  return <ChartView def={def} field={field} buckets={buckets} onSelect={onSelect} height={height} />;
}
