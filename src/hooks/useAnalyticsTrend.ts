'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { dashboardKeys } from '@/lib/queryKeys';
import type { AnalyticsTrendPoint } from '@/types/analytics';
import { browserTimezone } from '@/lib/calendarDates';

const MAX_FORMS = 10;

export const hasTrendData = (points?: AnalyticsTrendPoint[]) =>
  Array.isArray(points) && points.some((p) => p.responses > 0);

export interface UseAnalyticsTrendParams {
  from?: string;
  to?: string;
  bucket: 'day' | 'week';
  /** Forms to sum when the all-forms call has nothing (capped at MAX_FORMS). */
  formIds: string[];
  enabled: boolean;
  /** 'personal' (default) or a workspace slug. */
  scope?: string;
}

/**
 * Responses per bucket across a scope's forms for a date range, oldest first.
 * GET /api/analytics/trends REQUIRES a formId (400 "Valid formId query parameter is required"
 * without one - the cause of the 400s seen on Home / Analytics / Insights), so this sums the
 * per-form `trends` calls, capped at MAX_FORMS forms so a page never fans out unboundedly.
 * ponytail: capped sum; an all-forms aggregate endpoint is documented in api-reference.md.
 * `points` is undefined while loading or when there is no data - nothing is ever fabricated.
 */
export function useAnalyticsTrend({ from, to, bucket, formIds, enabled, scope = 'personal' }: UseAnalyticsTrendParams): { points: AnalyticsTrendPoint[] | undefined; isLoading: boolean } {
  const timezone = browserTimezone();
  const range = { from, to };
  const ids = formIds.slice(0, MAX_FORMS);

  const perForm = useQuery({
    queryKey: [...dashboardKeys.responseTrend(), 'per-form', scope, from, to, bucket, ids.join(',')],
    queryFn: async (): Promise<AnalyticsTrendPoint[]> => {
      const results = await Promise.allSettled(
        ids.map((formId) => analyticsService.getTrends({ ...range, formId, timezone, bucket }, scope)),
      );
      const byBucket = new Map<string, number>();
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const point of result.value.points ?? []) {
          byBucket.set(point.bucketStart, (byBucket.get(point.bucketStart) ?? 0) + point.responses);
        }
      }
      return [...byBucket.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([bucketStart, responses]) => ({ bucketStart, responses }));
    },
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });

  const points = Array.isArray(perForm.data) ? perForm.data : undefined;
  return {
    points: hasTrendData(points) ? points : undefined,
    isLoading: enabled && ids.length > 0 && perForm.isLoading,
  };
}
