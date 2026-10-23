'use client';

import { FilterChips, type FilterChip } from '@/components/ui/FilterChips';
import type { ResponseFilters, ResponseStats } from '@/types/response';
import type { StageRef } from '@/types/stage';

interface ResponsesCountChipsProps {
  stats?: ResponseStats;
  stages: readonly StageRef[];
  filters: ResponseFilters;
  onFilterChange: (patch: Partial<ResponseFilters>) => void;
}

/**
 * `All 77 · Unread 71 · New 16 · In progress 21 · Completed 40` — replaces the stat-card band. Counts come
 * from GET /api/responses/stats. A stage's count is `byStage` for that stage; when the stats payload lacks it
 * and the stage is the only one in its category, the category total is exact; otherwise the chip shows no number.
 * The counts are workspace/form-wide (the stats endpoint takes no filters), so they do not shrink with search.
 */
export function ResponsesCountChips({ stats, stages, filters, onFilterChange }: ResponsesCountChipsProps) {
  const stageCount = (stage: StageRef): number | undefined => {
    const exact = stats?.byStage.find((s) => s.stageId === stage.id)?.count;
    if (exact !== undefined) return exact;
    const sameCategory = stages.filter((s) => s.category === stage.category).length;
    return sameCategory === 1 ? stats?.byCategory[stage.category] : undefined;
  };

  const chips: FilterChip[] = [
    { id: 'all', label: 'All', count: stats?.total },
    { id: 'unread', label: 'Unread', count: stats?.unread },
    ...stages.map((s) => ({ id: `stage:${s.id}`, label: s.name, count: stats ? stageCount(s) : undefined })),
  ];
  const activeId = filters.stageId ? `stage:${filters.stageId}` : filters.unread ? 'unread' : 'all';

  return (
    <FilterChips
      chips={chips}
      activeId={activeId}
      ariaLabel="Filter responses"
      variant="tabs"
      onChange={(id) => {
        if (id === 'all') onFilterChange({ stageId: undefined, unread: undefined });
        else if (id === 'unread') onFilterChange({ stageId: undefined, unread: true });
        else onFilterChange({ stageId: id.slice('stage:'.length), unread: undefined });
      }}
    />
  );
}
