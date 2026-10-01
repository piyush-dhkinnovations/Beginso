import type { ReactNode } from 'react';
import { CHART_COLOR } from './Mini';

// Rings and donuts. Decorative unless the caller adds its own text: the centre label is real text
// (visible to assistive tech), the arcs are aria-hidden.

export interface RingProps {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Centre content. Omit for the default "NN%". Pass `null` for an empty centre. */
  children?: ReactNode;
}

export function Ring({ percent, size = 56, stroke = 8, color = CHART_COLOR.primary, children }: RingProps) {
  const p = Math.min(100, Math.max(0, percent));
  const r = 40 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const centre = children === undefined ? <span className="bg-caption font-bold tabular-nums text-(--text-primary)">{Math.round(p)}%</span> : children;
  return (
    <span className="relative inline-flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke={CHART_COLOR.softer} strokeWidth={stroke} />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} />
      </svg>
      {centre !== null && <span className="absolute inset-0 flex flex-col items-center justify-center text-center">{centre}</span>}
    </span>
  );
}

/** Several rings side by side, each with its own colour — e.g. quarterly targets. */
export function RingSet({ rings }: { rings: { percent: number; color?: string; label?: string }[] }) {
  return (
    <div className="flex items-center justify-around gap-2">
      {rings.map((r, i) => (
        <Ring key={i} percent={r.percent} size={64} stroke={9} color={r.color} />
      ))}
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({ segments, size = 110, centre, sub }: { segments: DonutSegment[]; size?: number; centre?: string; sub?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = 32;
  const c = 2 * Math.PI * r;
  const lens = segments.map((s) => (total > 0 ? (s.value / total) * c : 0));
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <span className="relative inline-flex flex-none items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke={CHART_COLOR.softer} strokeWidth="10" />
        {segments.map((s, i) => (
          <circle
            key={s.label}
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="10"
            strokeDasharray={`${Math.max(lens[i] - (segments.length > 1 ? 2 : 0), 0)} ${c}`}
            strokeDashoffset={-starts[i]}
          />
        ))}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-tight">
        <span className="text-[22px] font-bold tabular-nums text-(--text-primary)">{centre ?? total}</span>
        {sub && <span className="bg-caption text-(--text-muted)">{sub}</span>}
      </span>
    </span>
  );
}

export function Legend({ items, percent }: { items: DonutSegment[]; /** Also show each item's share of the total. */ percent?: boolean }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3 bg-body-sm">
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: i.color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-(--text-secondary)">{i.label}</span>
          <span className="font-semibold tabular-nums text-(--text-primary)">{i.value}</span>
          {percent && (
            <span className="w-10 text-right bg-caption tabular-nums text-(--text-muted)">
              {total > 0 ? Math.round((i.value / total) * 100) : 0}%
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Donut + legend side by side (stacks on narrow containers). */
export function DonutWithLegend({ segments, size = 110, sub = 'Total', percent }: { segments: DonutSegment[]; size?: number; sub?: string; percent?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <Donut segments={segments} size={size} sub={sub} />
      <div className="min-w-32 flex-1"><Legend items={segments} percent={percent} /></div>
    </div>
  );
}
