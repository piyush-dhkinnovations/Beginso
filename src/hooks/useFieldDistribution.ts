import { useQuery } from '@tanstack/react-query';
import { chartsService } from '@/services/charts';
import { chartKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { dateGranularity } from '@/lib/chartOptions';
import type { FormField } from '@/types/form';

/** Distribution behind a chart (and its preview, full-screen table and CSV): one request per field + range.
 * Date fields are bucketed by a granularity derived from the range, so the same URL always means the same chart. */
export function useFieldDistribution(args: { scope: string; formId: string; field?: FormField; range: AnalyticsRangeParams; enabled?: boolean }) {
  const { scope, formId, field, range, enabled = true } = args;
  const granularity = field?.type === 'date' ? dateGranularity(range.from, range.to) : undefined;
  const query = useQuery({
    queryKey: chartKeys.field(scope, formId, field?.fieldId ?? '', range, granularity),
    queryFn: () => chartsService.fieldDistribution(formId, field!.fieldId, range, granularity, scope),
    enabled: enabled && !!field,
  });
  return { ...query, granularity };
}
