import { Select } from '@/components/ui/Select';
import type { AuditFilters as AuditFilterValues } from '@/types/event';

export interface AuditActorOption {
  id: string;
  name: string;
}

export interface AuditFiltersProps {
  actors: AuditActorOption[];
  actorId: string;
  range: NonNullable<AuditFilterValues['range']>;
  onActorChange: (actorId: string) => void;
  onRangeChange: (range: NonNullable<AuditFilterValues['range']>) => void;
}

// requirements.md §7.7 / design.md §6, §15.3. Presentational and controlled — the page owns the
// state. Visible <label>s (Select's own `label` prop), not placeholder-only (requirements §11);
// stacks full-width below 768px per the wireframe note.
export function AuditFilters({ actors, actorId, range, onActorChange, onRangeChange }: AuditFiltersProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="w-full md:w-56">
        <Select id="audit-actor" label="Actor" value={actorId} onChange={(e) => onActorChange(e.target.value)}>
          <option value="">All actors</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full md:w-48">
        <Select
          id="audit-range"
          label="Date range"
          value={range}
          onChange={(e) => onRangeChange(e.target.value as AuditFiltersProps['range'])}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </Select>
      </div>
    </div>
  );
}
