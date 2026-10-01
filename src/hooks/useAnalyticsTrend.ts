'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analytics';
import { dashboardKeys } from '@/lib/queryKeys';
import type { AnalyticsTrendPoint } from '@/types/analytics';

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
}

/**
 * Responses per bucket across the caller's personal forms for a date range, oldest first.
 * Two real sources, best first:
 *  1. one `trends` call with no formId ("all forms in this scope" — needs backend confirmation);
 *  2. if that errors or is empty, the per-form `trends` calls the form Analytics page already relies
 *     on, summed by bucket (capped at MAX_FORMS forms so a page never fans out unboundedly).
 * `points` is undefined while loading or when neither source has data — callers fall back to a
 * non-trend visual; nothing is ever fabricated.
 */
export function useAnalyticsTrend({ from, to, bucket, formIds, enabled }: UseAnalyticsTrendParams): { points: AnalyticsTrendPoint[] | undefined; isLoading: boolean } {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const range = { from, to };

  const all = useQuery({
    queryKey: [...dashboardKeys.responseTrend(), 'all', from, to, bucket],
    queryFn: () => analyticsService.getTrends({ ...range, timezone, bucket }),
    enabled,
    retry: false,
  });

  const allUsable = hasTrendData(all.data?.points);
  const ids = formIds.slice(0, MAX_FORMS);
  const needFallback = enabled && !all.isLoading && !allUsable && ids.length > 0;

  const perForm = useQuery({
    queryKey: [...dashboardKeys.responseTrend(), 'per-form', from, to, bucket, ids.join(',')],
    queryFn: async (): Promise<AnalyticsTrendPoint[]> => {
      const results = await Promise.allSettled(
        ids.map((formId) => analyticsService.getTrends({ ...range, formId, timezone, bucket })),
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
    enabled: needFallback,
    retry: false,
  });

  const points = allUsable ? all.data?.points : Array.isArray(perForm.data) ? perForm.data : undefined;
  return {
    points: hasTrendData(points) ? points : undefined,
    // Still working on an answer: the all-forms call is in flight, or its fallback is.
    isLoading: enabled && (all.isLoading || (needFallback && perForm.isLoading)),
  };
}
