import { Tag } from '@/components/ui/Tag';
import type { ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';

export interface ActiveFilterChipsProps {
  filters: ResponseFilters;
  stages: readonly StageRef[];
  onRemove: (key: keyof ResponseFilters) => void;
  onClearAll: () => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.2): "Active filters render as removable
 * chips + 'Clear all'." Reads the stage name from `stages` for the stage chip so it never shows a
 * raw id.
 */
export function ActiveFilterChips({ filters, stages, onRemove, onClearAll }: ActiveFilterChipsProps) {
  const chips: { key: keyof ResponseFilters; label: string }[] = [];

  if (filters.stageId) {
    const stage = stages.find((s) => s.id === filters.stageId);
    chips.push({ key: 'stageId', label: `Stage: ${stage?.name ?? 'Unknown stage'}` });
  }
  if (filters.assigneeId) {
    chips.push({
      key: 'assigneeId',
      label: `Assignee: ${filters.assigneeId === 'unassigned' ? 'Unassigned' : filters.assigneeId === 'me' ? 'Me' : filters.assigneeId}`,
    });
  }
  if (filters.tagIds?.length) chips.push({ key: 'tagIds', label: `Tags: ${filters.tagIds.length}` });
  if (filters.unread) chips.push({ key: 'unread', label: 'Unread only' });
  if (filters.duplicate) chips.push({ key: 'duplicate', label: 'Duplicates only' });
  if (filters.from || filters.to) chips.push({ key: 'from', label: 'Date range' });
  if (filters.q) chips.push({ key: 'q', label: `Search: "${filters.q}"` });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Tag key={chip.key} onRemove={() => onRemove(chip.key)} removeLabel={`Remove filter: ${chip.label}`}>
          {chip.label}
        </Tag>
      ))}
      <button type="button" onClick={onClearAll} className="min-h-11 px-2 text-body-sm font-medium text-brand-600 hover:underline">
        Clear all
      </button>
    </div>
  );
}
