'use client';

import { ListFooter } from '@/components/ui/ListFooter';
import { ResponsesTable } from './ResponsesTable';
import { BulkActionBar, type BulkActionBarProps } from './BulkActionBar';
import type { IResponse, BulkTarget } from '@/types/response';
import type { useInboxSelection } from './useInboxSelection';

type BulkBarProps = BulkActionBarProps;
type Selection = ReturnType<typeof useInboxSelection>;

interface Props {
  responses: IResponse[];
  isLoading: boolean;
  selection: Selection;
  total: number | undefined;
  page: number;
  pageLimit: number;
  formId?: string;
  formNames?: Record<string, string>;
  hasActiveFilters: boolean;
  filterSummary: string;
  otherCount: number | undefined;
  filters: BulkBarProps['filters'];
  stages: BulkBarProps['stages'];
  tags: BulkBarProps['tags'];
  members: BulkBarProps['members'];
  role: BulkBarProps['role'];
  isBulkRunning: boolean;
  onBulk: BulkBarProps['onBulk'];
  onExport: (target: BulkTarget) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onViewResponse: (id: string) => void;
}

/**
 * Sprint 12 (inbox-collaboration), task 3.1: selection/bulk and pagination are Table-only —
 * selectedIds only ever gets populated via the Table's own checkboxes, and Board/Calendar/
 * Chart each own their data fetching (per-column/per-month/per-range), not this page's
 * single `data` query.
 */
export function ResponsesTableSection({
  responses, isLoading, selection, total, page, pageLimit, formId, formNames, hasActiveFilters, filterSummary, otherCount,
  filters, stages, tags, members, role, isBulkRunning, onBulk, onExport, onClearFilters, onPageChange, onViewResponse,
}: Props) {
  const { selectedIds, setSelectedIds, selectAllMatching, setSelectAllMatching, setConfirmDelete, clearSelection } = selection;
  return (
    // -mt-2 tightens just the gap above the table specifically (the page's other sections
    // keep the parent's gap-4) — the list itself shouldn't have extra breathing room before
    // the header row.
    <div className="flex flex-col gap-4 -mt-2">
      <BulkActionBar
        selectedIds={[...selectedIds]}
        selectAllMatching={selectAllMatching}
        totalMatching={total}
        onToggleSelectAllMatching={setSelectAllMatching}
        filters={filters}
        formId={formId}
        stages={stages}
        tags={tags}
        members={members}
        role={role}
        isLoading={isBulkRunning}
        onBulk={onBulk}
        onDeleteRequest={(target, count) => setConfirmDelete({ mode: 'bulk', target, count })}
        onExport={onExport}
        onClear={clearSelection}
      />

      <ResponsesTable
        responses={responses}
        isLoading={isLoading}
        selectedIds={selectedIds}
        formId={formId}
        formNames={formNames}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        filterSummary={filterSummary}
        otherCount={otherCount}
        onSelectAll={(checked) => {
          setSelectAllMatching(false);
          setSelectedIds(checked ? new Set(responses.map((r) => r._id)) : new Set());
        }}
        onSelectRow={(id, checked) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        onViewResponse={onViewResponse}
        onDeleteResponse={(id) => setConfirmDelete({ mode: 'single', target: { ids: [id] }, count: 1 })}
      />

      <ListFooter page={page} pageSize={pageLimit} total={total ?? 0} noun="response" onPageChange={onPageChange} />
    </div>
  );
}
