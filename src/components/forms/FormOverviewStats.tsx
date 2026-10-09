import { Users, MessageSquare, Gauge, Eye } from 'lucide-react';
import { KpiCard } from '@/components/ui';
import { Tooltip } from '@/components/ui/Tooltip';
import type { FormOverviewStats as Stats } from '@/types/form';

export interface FormOverviewStatsProps {
  stats: Stats;
  // Already-formatted text for the "who can see it" card — the page owns the grants query and
  // the personal-vs-workspace wording; this component only lays cards out.
  accessLabel: string;
  onOpenAccess: () => void;
  // Real analytics view count; null/undefined = not tracked, so the card is omitted (never a 0).
  views?: number | null;
}

// requirements.md §7.2–7.4 / design.md §6. Presentational — no fetching.
export function FormOverviewStats({ stats, accessLabel, onOpenAccess, views }: FormOverviewStatsProps) {
  const { responseCount, responseCountThisWeek, completionRate } = stats;
  const icon = (Icon: typeof Users) => <Icon aria-hidden="true" />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        variant={13}
        data={{
          label: 'Responses',
          value: responseCount,
          icon: icon(MessageSquare),
          tone: 'primary',
          delta: responseCountThisWeek ? { value: String(responseCountThisWeek), note: 'this week' } : undefined,
          emptyHint: 'No responses yet',
        }}
      />

      {/* Not fabricated as 0% (requirements.md §7.3): view-tracking may not exist yet. */}
      {completionRate === null ? (
        <Tooltip content="Not tracked yet" className="block h-full">
          <div tabIndex={0} aria-label="Completion rate not tracked yet" className="h-full">
            <KpiCard variant={16} data={{ label: 'Completion rate', value: '—', icon: icon(Gauge), tone: 'primary' }} />
          </div>
        </Tooltip>
      ) : (
        <KpiCard
          variant={16}
          data={{ label: 'Completion rate', value: `${Math.round(completionRate)}%`, percent: completionRate, icon: icon(Gauge), tone: 'primary' }}
        />
      )}

      {views != null && (
        <KpiCard variant={13} data={{ label: 'Views', value: views, icon: icon(Eye), tone: 'primary' }} />
      )}

      {/* A real button, not a clickable div (design.md §18) — it opens FormAccessPanel. */}
      <button
        type="button"
        aria-label={`View who has access: ${accessLabel}`}
        onClick={onOpenAccess}
        className="h-full min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left"
      >
        <KpiCard variant={13} data={{ label: 'Who can see it', value: accessLabel, icon: icon(Users), tone: 'primary' }} />
      </button>
    </div>
  );
}
