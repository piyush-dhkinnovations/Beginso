'use client';

import { useId } from 'react';
import { CHART_COLOR } from './Mini';
import { curve, labelIndices, niceAxis } from './math';
import { useWidth } from './useWidth';

// Axis charts. Layout is computed in real pixels from the measured container width (useWidth), so
// text stays a constant size and bars/points spread correctly at any width — no stretched SVG.
// Each is role="img" with a label; callers that need the exact figures add a visually-hidden table.

export interface ChartDatum {
  label: string;
  value: number;
}

const PAD = { top: 12, right: 12, bottom: 28, left: 34 };

function Frame({
  data,
  height,
  ariaLabel,
  secondary,
  children,
}: {
  data: ChartDatum[];
  height: number;
  ariaLabel: string;
  secondary?: number[];
  children: (g: { w: number; plotW: number; plotH: number; y: (v: number) => number; x: (i: number) => number; band: number }) => React.ReactNode;
}) {
  const [ref, w] = useWidth();
  const top = Math.max(...data.map((d) => d.value), ...(secondary ?? []), 0);
  const axis = niceAxis(top);
  const plotW = w - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length > 0 ? plotW / data.length : plotW;
  const y = (v: number) => PAD.top + plotH - (v / axis.max) * plotH;
  const x = (i: number) => PAD.left + band * i + band / 2;
  const show = labelIndices(data.length, Math.max(2, Math.floor(plotW / 56)));
  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={height} role="img" aria-label={ariaLabel}>
        {axis.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="11" fill="var(--text-muted)">{t}</text>
          </g>
        ))}
        {children({ w, plotW, plotH, y, x, band })}
        {data.map((d, i) =>
          show.has(i) ? (
            <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{d.label}</text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

const barWidth = (band: number) => Math.max(4, Math.min(34, band * 0.6));

export function BarChart({ data, height = 200, ariaLabel, highlight }: { data: ChartDatum[]; height?: number; ariaLabel: string; highlight?: number }) {
  const peak = highlight ?? data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  return (
    <Frame data={data} height={height} ariaLabel={ariaLabel}>
      {({ y, x, band }) =>
        data.map((d, i) => {
          const bw = barWidth(band);
          const top = y(d.value);
          return (
            <rect
              key={i}
              x={x(i) - bw / 2}
              y={top}
              width={bw}
              height={Math.max(y(0) - top, d.value > 0 ? 2 : 0)}
              rx={Math.min(5, bw / 2)}
              fill={i === peak ? CHART_COLOR.primary : CHART_COLOR.soft}
              opacity={i === peak ? 1 : 0.6}
            />
          );
        })
      }
    </Frame>
  );
}

export function LineChart({ data, height = 200, ariaLabel }: { data: ChartDatum[]; height?: number; ariaLabel: string }) {
  const gid = useId();
  return (
    <Frame data={data} height={height} ariaLabel={ariaLabel}>
      {({ y, x }) => {
        const pts = data.map((d, i) => [x(i), y(d.value)] as const);
        if (pts.length === 0) return null;
        const line = curve(pts);
        return (
          <>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: CHART_COLOR.primary, stopOpacity: 0.26 }} />
                <stop offset="100%" style={{ stopColor: CHART_COLOR.primary, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {pts.length > 1 && <path d={`${line} L${pts[pts.length - 1][0]} ${y(0)} L${pts[0][0]} ${y(0)} Z`} fill={`url(#${gid})`} />}
            <path d={line} fill="none" stroke={CHART_COLOR.primary} strokeWidth="2.5" strokeLinecap="round" />
            {pts.length <= 31 && pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="3.5" fill="var(--surface-card)" stroke={CHART_COLOR.primary} strokeWidth="2.5" />)}
          </>
        );
      }}
    </Frame>
  );
}

/** Bars for `data` with a second series drawn as a line over them. */
export function ComboChart({ data, line, height = 200, ariaLabel }: { data: ChartDatum[]; line: number[]; height?: number; ariaLabel: string }) {
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  return (
    <Frame data={data} height={height} ariaLabel={ariaLabel} secondary={line}>
      {({ y, x, band }) => {
        const pts = line.map((v, i) => [x(i), y(v)] as const);
        return (
          <>
            {data.map((d, i) => {
              const bw = barWidth(band);
              return (
                <rect key={i} x={x(i) - bw / 2} y={y(d.value)} width={bw} height={Math.max(y(0) - y(d.value), d.value > 0 ? 2 : 0)} rx={Math.min(5, bw / 2)} fill={i === peak ? CHART_COLOR.primary : CHART_COLOR.soft} opacity={i === peak ? 0.85 : 0.55} />
              );
            })}
            {pts.length > 1 && <path d={curve(pts)} fill="none" stroke={CHART_COLOR.success} strokeWidth="2.5" strokeLinecap="round" />}
            {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r="3.5" fill="var(--surface-card)" stroke={CHART_COLOR.success} strokeWidth="2.5" />)}
          </>
        );
      }}
    </Frame>
  );
}

/** Labelled horizontal bars, each scaled against `max` (default: the largest value). */
export function ProgressBars({ items, max }: { items: { label: string; value: number; color?: string; display?: string }[]; max?: number }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1.5">
          <span className="bg-body-sm text-(--text-secondary)">{item.label}</span>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: CHART_COLOR.softer }} aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.value / top) * 100)}%`, backgroundColor: item.color ?? CHART_COLOR.primary }} />
            </div>
            <span className="min-w-4 whitespace-nowrap text-right bg-body-sm font-semibold tabular-nums text-(--text-primary)">{item.display ?? item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
