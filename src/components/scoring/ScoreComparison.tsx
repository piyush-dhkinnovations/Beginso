'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Table, type TableColumn } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { scoresService } from '@/services/scores';
import { scoreKeys } from '@/lib/queryKeys';
import type { ScoreComparisonRow } from '@/types/score';

export interface ScoreComparisonProps {
  formId: string;
}

/**
 * Sprint 12 (inbox-collaboration), tasks.md 5.2 — OQ-7 resolved 3 Oct 2026. `ui/Table` across a
 * form's responses, sortable by average score (design.md §11.2's `GET .../score-comparison?sort`).
 * Placement: no wireframe and design.md doesn't name a surface for this (§15 only says "comparison
 * as a `ui/Table`") — judgment call, see the Form Overview link that renders this via
 * `/forms/[id]/scores` (closest existing analytics-style surface, same place PDF/CSV export scope
 * already narrows to one form).
 */
export function ScoreComparison({ formId }: ScoreComparisonProps) {
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);
  const sort = sortDesc ? '-scoreAverage' : 'scoreAverage';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: scoreKeys.comparison(formId, { page, sort }),
    queryFn: () => scoresService.getComparison(formId, { page, sort }),
    enabled: !!formId,
  });

  if (isError) {
    return (
      <EmptyState
        heading="Unable to load score comparison"
        body="The score comparison could not be loaded."
        action={
          <button type="button" onClick={() => void refetch()} className="text-body-sm text-(--action-primary) underline">
            Try again
          </button>
        }
      />
    );
  }

  const columns: TableColumn<ScoreComparisonRow>[] = [
    {
      key: 'reference',
      header: 'Response',
      render: (row) => <span className="text-body-sm text-(--text-primary)">{row.reference ?? row.responseId.slice(-6)}</span>,
    },
    {
      key: 'scoreAverage',
      header: (
        <button
          type="button"
          onClick={() => setSortDesc((d) => !d)}
          className="flex items-center gap-1 text-body-sm font-medium text-(--text-secondary)"
        >
          Average score
          {sortDesc ? <ArrowDown size={13} aria-hidden="true" /> : <ArrowUp size={13} aria-hidden="true" />}
        </button>
      ),
      render: (row) => (
        <span className="text-body-sm text-(--text-primary)">
          {row.scoreAverage !== null
            ? `${row.scoreAverage.toFixed(1)} (${row.scoreCount} reviewer${row.scoreCount === 1 ? '' : 's'})`
            : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Table
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(row) => row.responseId}
        isLoading={isLoading}
        emptyState={<p className="py-6 text-center text-body-sm text-(--text-muted)">No scored responses yet.</p>}
      />
      {data && data.total > data.limit && (
        <Pagination page={data.page} totalPages={Math.ceil(data.total / data.limit)} onPageChange={setPage} />
      )}
    </div>
  );
}
