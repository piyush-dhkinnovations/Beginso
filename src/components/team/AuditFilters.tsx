import { Toolbar } from '@/components/ui/Toolbar';
import { FilterMenu } from '@/components/ui/FilterMenu';
import type { AuditFilters as AuditFilterValues } from '@/types/event';

export interface AuditActorOption {
  id: string;
  name: string;
}

type Range = NonNullable<AuditFilterValues['range']>;

export const AUDIT_RANGE_LABEL: Record<Range, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All time' };

export interface AuditFiltersProps {
  actors: AuditActorOption[];
  actorId: string;
  range: Range;
  onActorChange: (actorId: string) => void;
  onRangeChange: (range: Range) => void;
}

// requirements.md §7.7 / design.md §6, §15.3. Presentational and controlled — the page owns the state.
// Named Actor / Date buttons on one --bg-subtle bar; each shows its active value and closes after a selection.
export function AuditFilters({ actors, actorId, range, onActorChange, onRangeChange }: AuditFiltersProps) {
  return (
    <Toolbar>
      <FilterMenu
        label="Actor"
        options={actors.map((a) => ({ id: a.id, label: a.name }))}
        selectedIds={actorId ? [actorId] : []}
        valueLabel={actors.find((a) => a.id === actorId)?.name}
        clearLabel="All actors"
        onSelect={onActorChange}
        onClear={() => onActorChange('')}
      />
      <FilterMenu
        label="Date"
        options={(['7d', '30d'] as const).map((r) => ({ id: r, label: AUDIT_RANGE_LABEL[r] }))}
        selectedIds={range === 'all' ? [] : [range]}
        clearLabel={AUDIT_RANGE_LABEL.all}
        onSelect={(id) => onRangeChange(id as Range)}
        onClear={() => onRangeChange('all')}
      />
    </Toolbar>
  );
}
