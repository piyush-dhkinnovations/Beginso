import { Users, MessageSquare, Gauge } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Tooltip } from '@/components/ui/Tooltip';
import type { FormOverviewStats as Stats } from '@/types/form';

export interface FormOverviewStatsProps {
  stats: Stats;
  // Already-formatted text for the "who can see it" card — the page owns the grants query and
  // the personal-vs-workspace wording; this component only lays cards out.
  accessLabel: string;
  onOpenAccess: () => void;
}

// requirements.md §7.2–7.4 / design.md §6. Presentational — three cards, no fetching.
export function FormOverviewStats({ stats, accessLabel, onOpenAccess }: FormOverviewStatsProps) {
  const { responseCount, responseCountThisWeek, completionRate } = stats;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <StatCard
        label="Responses"
        value={responseCount}
        icon={<MessageSquare className="bg-icon" aria-hidden="true" />}
        delta={
          responseCountThisWeek !== null
            ? { label: `+${responseCountThisWeek} this week`, direction: responseCountThisWeek > 0 ? 'up' : 'flat' }
            : undefined
        }
      />

      <StatCard
        label="Completion rate"
        icon={<Gauge className="bg-icon" aria-hidden="true" />}
        value={
          completionRate === null ? (
            // Not fabricated as 0% (requirements.md §7.3): view-tracking may not exist yet.
            <Tooltip content="Not tracked yet">
              <span tabIndex={0} aria-label="Completion rate not tracked yet">
                —
              </span>
            </Tooltip>
          ) : (
            `${Math.round(completionRate)}%`
          )
        }
      />

      {/* A real button, not a clickable div (design.md §18) — it opens FormAccessPanel. */}
      <button
        type="button"
        aria-label={`View who has access: ${accessLabel}`}
        onClick={onOpenAccess}
        className="text-left"
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
      >
        <StatCard
          label="Who can see it"
          value={accessLabel}
          icon={<Users className="bg-icon" aria-hidden="true" />}
          style={{ height: '100%' }}
        />
      </button>
    </div>
  );
}
