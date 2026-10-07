import { useId } from 'react';
import { bx } from '@/lib/utils';
import { curve, scalePoints } from './math';

// Small decorative marks for StatCard (and anywhere a number needs a hint of shape). The number and
// label beside them carry the meaning, so every mark is aria-hidden. Colours are tokens throughout.

export const CHART_COLOR = {
  primary: 'var(--action-primary)',
  soft: 'var(--chart-muted-2)',
  softer: 'var(--chart-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
} as const;

function Gradient({ id, color = CHART_COLOR.primary, from = 0.28 }: { id: string; color?: string; from?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style={{ stopColor: color, stopOpacity: from }} />
      <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
    </linearGradient>
  );
}

// ── Lines ─────────────────────────────────────────────────────────────────────

export interface LineProps {
  values: number[];
  /** Fill under the line. Default true (the "line / area" look); false gives the bare sparkline. */
  area?: boolean;
  dot?: boolean;
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({ values, area = true, dot = true, color = CHART_COLOR.primary, height = 56, className }: LineProps) {
  const gid = useId();
  const w = 140;
  const pts = scalePoints(values, w, height);
  if (pts.length < 2) return null;
  const line = curve(pts);
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={bx('w-full', className)}
      style={{ maxWidth: 220, height }}
      aria-hidden="true"
    >
      <defs><Gradient id={gid} color={color} /></defs>
      {area && <path d={`${line} L${w} ${height} L0 ${height} Z`} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {dot && <circle cx={last[0] - 3} cy={last[1]} r="3.5" fill={color} />}
    </svg>
  );
}

/** Two series on one scale: the first filled, the second a line on top. */
export function MultiLine({ values, secondary, height = 64 }: { values: number[]; secondary: number[]; height?: number }) {
  const max = Math.max(...values, ...secondary);
  return (
    <span className="relative block w-full" style={{ maxWidth: 220, height }} aria-hidden="true">
      <SparkOnScale values={values} max={max} height={height} filled />
      <SparkOnScale values={secondary} max={max} height={height} color={CHART_COLOR.success} className="absolute inset-0" />
    </span>
  );
}

function SparkOnScale({ values, max, height, filled, color = CHART_COLOR.primary, className }: { values: number[]; max: number; height: number; filled?: boolean; color?: string; className?: string }) {
  const gid = useId();
  const w = 140;
  const pts = scalePoints(values, w, height, 4, max);
  if (pts.length < 2) return null;
  const line = curve(pts);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={bx('w-full', className)} style={{ height }}>
      <defs><Gradient id={gid} color={color} /></defs>
      {filled && <path d={`${line} L${w} ${height} L0 ${height} Z`} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0] - 3} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}

// ── Bars ──────────────────────────────────────────────────────────────────────

const rel = (v: number, max: number) => `${Math.max(14, (v / Math.max(max, 1)) * 100)}%`;

/** Vertical bars, the last one highlighted. */
export function MiniBars({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }} aria-hidden="true">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <span
            key={i}
            className="w-2 flex-none rounded-full"
            style={{ height: rel(v, max), backgroundColor: last ? CHART_COLOR.primary : CHART_COLOR.soft, opacity: last ? 1 : 0.5 + (i / values.length) * 0.4 }}
          />
        );
      })}
    </div>
  );
}

/** Each bar is a total with the share that matters drawn over it. `values` and `part` align by index. */
export function DualBars({ values, part, height = 56 }: { values: number[]; part: number[]; height?: number }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }} aria-hidden="true">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        const share = v > 0 ? Math.min(1, (part[i] ?? 0) / v) : 0;
        return (
          <span key={i} className="relative w-3 flex-none" style={{ height: rel(v, max) }}>
            <span className="absolute inset-0 rounded-md" style={{ backgroundColor: CHART_COLOR.soft, opacity: 0.55 }} />
            <span className="absolute inset-x-0 bottom-0 rounded-md" style={{ height: `${share * 100}%`, backgroundColor: last ? CHART_COLOR.primary : CHART_COLOR.soft }} />
          </span>
        );
      })}
    </div>
  );
}

/** Each column stacks its segments (bottom → top) in three tones. */
export function StackedBars({ columns, height = 56 }: { columns: number[][]; height?: number }) {
  const tones = [CHART_COLOR.softer, CHART_COLOR.soft, CHART_COLOR.primary];
  const totals = columns.map((c) => c.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  return (
    <div className="flex items-end gap-2" style={{ height }} aria-hidden="true">
      {columns.map((c, i) => (
        <span key={i} className="flex w-3 flex-none flex-col-reverse gap-px overflow-hidden rounded-md" style={{ height: rel(totals[i], max) }}>
          {c.map((v, j) => (
            <span key={j} style={{ flex: v, backgroundColor: tones[j % tones.length] }} />
          ))}
        </span>
      ))}
    </div>
  );
}

/** Weekday columns with one-letter labels; `highlight` is the index to emphasise (default: tallest). */
export function ColumnBars({ values, labels, highlight }: { values: number[]; labels: string[]; highlight?: number }) {
  const max = Math.max(...values, 1);
  const peak = highlight ?? values.indexOf(Math.max(...values));
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      <div className="flex h-14 items-end gap-2">
        {values.map((v, i) => (
          <span key={i} className="w-3 flex-none rounded-md" style={{ height: rel(v, max), backgroundColor: i === peak ? CHART_COLOR.primary : CHART_COLOR.soft, opacity: i === peak ? 1 : 0.55 }} />
        ))}
      </div>
      <div className="flex gap-2">
        {labels.map((l, i) => (
          <span key={i} className="w-3 flex-none text-center text-[9px] leading-none text-(--text-muted)">{l.charAt(0)}</span>
        ))}
      </div>
    </div>
  );
}

/** One horizontal bar split into labelled parts, e.g. earlier vs this month. Parts share the full width. */
export function SplitBar({ parts, width = 144 }: { parts: { value: number; color?: string }[]; width?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const tones = [CHART_COLOR.soft, CHART_COLOR.primary, CHART_COLOR.success];
  return (
    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" style={{ width, backgroundColor: CHART_COLOR.softer }} aria-hidden="true">
      {parts.map((p, i) =>
        p.value > 0 ? (
          <span key={i} className="h-full" style={{ width: `${(p.value / Math.max(total, 1)) * 100}%`, minWidth: 6, backgroundColor: p.color ?? tones[i % tones.length] }} />
        ) : null,
      )}
    </div>
  );
}

/** Horizontal fill, e.g. 2 of 4 published. */
export function ProgressBar({ percent, width = 144, color = CHART_COLOR.primary }: { percent: number; width?: number; color?: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="h-2.5 overflow-hidden rounded-full" style={{ width, backgroundColor: CHART_COLOR.softer }} aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${p}%`, background: `linear-gradient(90deg, ${CHART_COLOR.soft}, ${color})` }} />
    </div>
  );
}
