'use client';

import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFormFields } from '@/hooks/useFormFields';
import { responsesService } from '@/services/responses';
import { serialiseChartFilter } from '@/lib/chartBuilder';
import { detectRespondentIdentity, formatResponseDate, shortId } from '@/lib/formatters';
import type { ChartQuery, QueryEntry } from '@/types/chartBuilder';

const PAGE = 20;

/** The Responses page of a chart's group: the same filter code the chart used, so the number here is the number on the bar. */
export function chartResponsesHref(scope: string, formId: string, query: ChartQuery, entry?: QueryEntry | null): string {
  const params = new URLSearchParams();
  if (scope !== 'personal') params.set('ws', scope);
  params.set('chart', serialiseChartFilter(query, entry?.focus));
  return `/forms/${formId}/inbox?${params.toString()}`;
}

interface ChartResponsesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string;
  scope: string;
  chartTitle: string;
  query: ChartQuery | null;
  /** The group that was clicked. */
  entry: QueryEntry | null;
  onOpenResponse: (id: string) => void;
}

/**
 * The side screen that opens when a part of a chart is clicked: the responses behind it, 20 at a time, the same way the Responses page
 * opens a response. "Open in Responses" carries the chart's filter to the full list.
 */
export function ChartResponsesDrawer({ isOpen, onClose, formId, scope, chartTitle, query, entry, onOpenResponse }: ChartResponsesDrawerProps) {
  const router = useRouter();
  const fields = useFormFields(formId);
  const chart = query ? serialiseChartFilter(query, entry?.focus) : '';

  const list = useInfiniteQuery({
    queryKey: ['chart-responses', scope, formId, chart],
    queryFn: ({ pageParam }) => responsesService.getResponses({ formId, chart, page: pageParam, limit: PAGE }, scope),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: isOpen && !!query,
  });
  const total = list.data?.pages[0]?.total;
  const rows = list.data?.pages.flatMap((p) => p.data) ?? [];
  const stale = entry && total !== undefined && total !== entry.n;

  return (
    <Drawer
      isOpen={isOpen && !!query}
      onClose={onClose}
      title={entry ? (total !== undefined ? `${entry.label} - ${total.toLocaleString()} ${total === 1 ? 'response' : 'responses'}` : entry.label) : 'Responses'}
      description={chartTitle}
    >
      <div className="flex flex-col gap-3">
        {query && (
          <Button variant="secondary" size="small" className="self-start" onClick={() => router.push(chartResponsesHref(scope, formId, query, entry))}>
            Open in Responses
          </Button>
        )}
        {stale && (
          <p className="bg-caption text-(--text-muted)">
            The chart counted {entry.n.toLocaleString()} here; {total.toLocaleString()} match now, because responses may have arrived since it loaded.
          </p>
        )}

        {list.isLoading ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading responses">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="block" height={56} className="w-full rounded-lg" />
            ))}
          </div>
        ) : list.isError ? (
          <EmptyState icon={<AlertCircle />} title="Unable to load these responses" actions={<Button variant="secondary" size="small" onClick={() => void list.refetch()}>Try again</Button>} />
        ) : rows.length === 0 ? (
          <p className="bg-body-sm text-(--text-muted)">No responses match yet.</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col divide-y divide-(--border-subtle) p-0">
              {rows.map((r) => {
                const who = detectRespondentIdentity(r.answers, fields, r.respondentEmail);
                const name = who.label ?? who.email ?? r.reference ?? shortId(r._id);
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
                        <span className="truncate bg-caption text-(--text-muted)">{who.label ? who.email ?? r.reference : r.reference}</span>
                      </span>
                      <span className="shrink-0 bg-caption text-(--text-muted)">{formatResponseDate(r.submittedAt ?? r.createdAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {list.hasNextPage && (
              <Button variant="secondary" size="small" onClick={() => void list.fetchNextPage()} isLoading={list.isFetchingNextPage}>
                Load more
              </Button>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
