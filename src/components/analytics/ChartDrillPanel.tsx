'use client';

import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DrillTarget } from './ChartView';
import { responsesService } from '@/services/responses';
import { chartKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { drillHref } from '@/lib/chartDrill';
import { detectRespondentIdentity, formatResponseDate, shortId } from '@/lib/formatters';
import { useFormFields } from '@/hooks/useFormFields';
import type { DateGranularity } from '@/types/charts';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';

const PAGE = 20;

export interface DrillState {
  chartId: string;
  fieldId: string;
  target: DrillTarget;
}

interface ChartDrillPanelProps {
  /** Hidden (not unmounted) state is the caller's job: pass isOpen=false while a response is open on top. */
  isOpen: boolean;
  drill: DrillState | null;
  onClose: () => void;
  formId: string;
  scope: string;
  field?: FormField;
  range: AnalyticsRangeParams;
  granularity?: DateGranularity;
  onOpenResponse: (id: string) => void;
}

function answerText(response: IResponse, field?: FormField): string {
  const v = field ? response.answers[field.label] : undefined;
  if (v === undefined || v === null || v === '') return '';
  return Array.isArray(v) ? v.join(', ') : String(v);
}

// Side panel (right; full-screen sheet on phones - the Drawer is 100vw there). The SERVER filters and
// paginates: GET /api/responses?formId&field&value[&granularity]&from&to. The header count is the server's
// `total`, which must equal the chart's count for the segment.
export function ChartDrillPanel({ isOpen, drill, onClose, formId, scope, field, range, granularity, onOpenResponse }: ChartDrillPanelProps) {
  const router = useRouter();
  const formFields = useFormFields(formId);
  const target = drill?.target;
  const gran = field?.type === 'date' ? granularity : undefined;

  const query = useInfiniteQuery({
    queryKey: chartKeys.drill(scope, formId, drill?.fieldId ?? '', target?.value, range, gran),
    queryFn: ({ pageParam }) =>
      responsesService.getResponses({ formId, field: drill?.fieldId, value: target?.value, granularity: gran, from: range.from, to: range.to, page: pageParam, limit: PAGE }, scope),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: !!drill,
  });

  const total = query.data?.pages[0]?.total;
  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];
  const mismatch = target && total !== undefined && total !== target.count;
  const href = drill ? drillHref({ scope, formId, fieldId: drill.fieldId, value: target?.value, granularity: gran, from: range.from, to: range.to }) : '#';

  return (
    <Drawer
      isOpen={isOpen && !!drill}
      onClose={onClose}
      title={target ? (total !== undefined ? `${target.label} - ${total.toLocaleString()} ${total === 1 ? 'response' : 'responses'}` : target.label) : 'Responses'}
      description={field ? `Answers to "${field.label}"` : undefined}
    >
      <div className="flex flex-col gap-3">
        <Button variant="secondary" size="small" onClick={() => router.push(href)}>View all in Responses</Button>
        {mismatch && (
          <p className="bg-caption text-(--text-muted)">
            The chart counted {target.count.toLocaleString()} for this segment; {total.toLocaleString()} match now, because responses may have arrived since it loaded.
          </p>
        )}

        {query.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading responses">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="block" height={56} className="w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState icon={<AlertCircle />} title="Unable to load these responses" actions={<Button variant="secondary" size="small" onClick={() => void query.refetch()}>Try again</Button>} />
        ) : rows.length === 0 ? (
          <p className="bg-body-sm text-(--text-muted)">No responses match this segment.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-(--border-subtle)">
              {rows.map((r) => {
                const who = detectRespondentIdentity(r.answers, formFields, r.respondentEmail);
                const name = who.label ?? who.email ?? r.reference ?? shortId(r._id);
                const answer = answerText(r, field);
                return (
                  <li key={r._id}>
                    <button
                      type="button"
                      onClick={() => onOpenResponse(r._id)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-md px-1 py-2 text-left hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)"
                    >
                      <Avatar name={name} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate bg-body-sm font-medium text-(--text-primary)">{name}</span>
                        <span className="truncate bg-caption text-(--text-secondary)">{answer || 'No answer'}</span>
                      </span>
                      <span className="shrink-0 bg-caption text-(--text-muted)">{formatResponseDate(r.submittedAt ?? r.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {query.hasNextPage && (
              <Button variant="secondary" size="small" onClick={() => void query.fetchNextPage()} isLoading={query.isFetchingNextPage}>
                Load more
              </Button>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
