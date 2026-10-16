'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { dashboardKeys } from '@/lib/queryKeys';
import type { AnalyticsTrendPoint } from '@/types/analytics';
import { browserTimezone } from '@/lib/calendarDates';

export const hasTrendData = (points?: AnalyticsTrendPoint[]) =>
  Array.isArray(points) && points.some((p) => p.responses > 0);

export interface UseAnalyticsTrendParams {
  from?: string;
  to?: string;
  bucket: 'day' | 'week';
  /** Only gates the request (no forms, nothing to chart); the API aggregates every form in the scope itself. */
  formIds: string[];
  enabled: boolean;
  /** 'personal' (default) or a workspace slug. */
  scope?: string;
}

/**
 * Responses per bucket across every form in a scope for a date range, oldest first: ONE request.
 * GET /api/analytics/trends without a formId aggregates the caller's whole scope server-side. This
 * used to sum up to 10 per-form calls (10 requests per page, and forms past the 10th silently missing).
 * `points` is undefined while loading or when there is no data - nothing is ever fabricated.
 */
export function useAnalyticsTrend({ from, to, bucket, formIds, enabled, scope = 'personal' }: UseAnalyticsTrendParams): { points: AnalyticsTrendPoint[] | undefined; isLoading: boolean } {
  const timezone = browserTimezone();
  const active = enabled && formIds.length > 0;

  const trend = useQuery({
    queryKey: [...dashboardKeys.responseTrend(), 'scope', scope, from, to, bucket, timezone],
    queryFn: async (): Promise<AnalyticsTrendPoint[]> => {
      const result = await analyticsService.getTrends({ from, to, timezone, bucket }, scope);
      return [...(result.points ?? [])].sort((x, y) => x.bucketStart.localeCompare(y.bucketStart));
    },
    enabled: active,
    staleTime: 60_000,
  });

  const points = Array.isArray(trend.data) ? trend.data : undefined;
  return {
    points: hasTrendData(points) ? points : undefined,
    isLoading: active && trend.isLoading,
  };
}
