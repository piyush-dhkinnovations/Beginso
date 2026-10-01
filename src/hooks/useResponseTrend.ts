'use client';

import { useMemo } from 'react';
import { resolveDateRangePreset } from '@/lib/dateRange';
import { useAnalyticsTrend } from './useAnalyticsTrend';

/** Responses per day for the last 30 days across the caller's personal forms, oldest first — the
 * series behind Home's Total Responses line (see useAnalyticsTrend for the two data sources). */
export function useResponseTrend(formIds: string[], enabled: boolean): number[] | undefined {
  const range = useMemo(() => resolveDateRangePreset('30d'), []);
  const { points } = useAnalyticsTrend({ ...range, bucket: 'day', formIds, enabled });
  return points && points.length > 1 ? points.map((p) => p.responses) : undefined;
}
