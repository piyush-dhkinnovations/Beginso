import { Tag } from '@/components/ui/Tag';
import type { ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';

export interface ActiveFilterChipsProps {
  filters: ResponseFilters;
  stages: readonly StageRef[];
  onRemove: (key: keyof ResponseFilters) => void;
  onClearAll: () => void;
  /** Chart drill-down chip text, e.g. "Satisfaction: Very satisfied" - resolved by the caller from the form. */
  fieldChipLabel?: string;
  /** Filters the page already shows somewhere else (the stage tabs), so no chip repeats them. */
  omit?: readonly (keyof ResponseFilters)[];
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.2): "Active filters render as removable
 * chips + 'Clear all'." Reads the stage name from `stages` for the stage chip so it never shows a
 * raw id.
 */
export function ActiveFilterChips({ filters, stages, onRemove, onClearAll, fieldChipLabel, omit = [] }: ActiveFilterChipsProps) {
  const all: { key: keyof ResponseFilters; label: string }[] = [];

  if (filters.stageId) {
    const stage = stages.find((s) => s.id === filters.stageId);
    all.push({ key: 'stageId', label: `Stage: ${stage?.name ?? 'Unknown stage'}` });
  }
  if (filters.assigneeId) {
    all.push({
      key: 'assigneeId',
      label: `Assignee: ${filters.assigneeId === 'unassigned' ? 'Unassigned' : filters.assigneeId === 'me' ? 'Me' : filters.assigneeId}`,
    });
  }
  if (filters.tagIds?.length) all.push({ key: 'tagIds', label: `Tags: ${filters.tagIds.length}` });
  if (filters.unread) all.push({ key: 'unread', label: 'Unread only' });
  if (filters.duplicate) all.push({ key: 'duplicate', label: 'Similar responses only' });
  if (filters.from || filters.to) all.push({ key: 'from', label: 'Date range' });
  if (filters.field) all.push({ key: 'field', label: fieldChipLabel ?? 'Chart filter' });
  if (filters.chart) all.push({ key: 'chart', label: 'From a chart' });
  if (filters.q) all.push({ key: 'q', label: `Search: "${filters.q}"` });

  const chips = all.filter((c) => !omit.includes(c.key));
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Tag key={chip.key} onRemove={() => onRemove(chip.key)} removeLabel={`Remove filter: ${chip.label}`}>
          {chip.label}
        </Tag>
      ))}
      <button type="button" onClick={onClearAll} className="min-h-9 px-2 bg-body-sm font-medium text-(--text-link) hover:underline">
        Clear all
      </button>
    </div>
  );
}
