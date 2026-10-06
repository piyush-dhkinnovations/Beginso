'use client';

import { useCallback, useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { CHART_COLOR } from './Mini';
import { curve, labelIndices, niceAxis } from './math';
import { useWidth } from './useWidth';

// Interactive, in-house SVG charts for the custom-chart dashboard (no charting library). Every segment is
// hoverable (tooltip), focusable (roving tabindex, arrow keys move between segments, Enter/Space selects)
// and clickable. Colours are design tokens, so every theme and dark variant resolves them. Meaning is never
// colour-only: each segment is also named in its tooltip, aria-label and (pie) legend.

export interface ChartSegment {
  /** Raw value - what a drill-down sends to the server. */
  key: string;
  label: string;
  count: number;
  percentage: number;
  /** The display figure (a count or a percentage). */
  text: string;
}

export interface InteractiveChartProps {
  data: ChartSegment[];
  ariaLabel: string;
  /** Click / Enter / Space on a segment. Omit for a read-only chart (the drawer preview). */
  onSelect?: (segment: ChartSegment) => void;
}

const SERIES = ['var(--action-primary)', 'var(--info)', 'var(--success)', 'var(--warning)', 'var(--error)', 'var(--action-secondary)'];
/** Categorical colour i: six distinct token hues, then the same hues progressively tinted. */
export function seriesColor(i: number): string {
  const base = SERIES[i % SERIES.length];
  const round = Math.floor(i / SERIES.length);
  return round === 0 ? base : `color-mix(in srgb, ${base} ${Math.max(30, 70 - round * 18)}%, var(--surface-card))`;
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, Math.max(1, max - 1))}…`);
const FRAME: CSSProperties = { outline: 'none' };

function useChartNav({ data, onSelect }: InteractiveChartProps) {
  const [wrapEl, setWrapEl] = useState<HTMLDivElement | null>(null);
  const [measure, width] = useWidth();
  const attach = useCallback(
    (n: HTMLDivElement | null) => {
      setWrapEl(n);
      return measure(n);
    },
    [measure],
  );
  const [active, setActive] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const rel = (x: number, y: number) => {
    const r = wrapEl?.getBoundingClientRect();
    return r ? { x: x - r.left, y: y - r.top } : null;
  };

  function itemProps(i: number, extraStyle?: CSSProperties) {
    const d = data[i];
    const interactive = !!onSelect;
    return {
      'data-seg': i,
      role: interactive ? 'button' : 'img',
      tabIndex: interactive ? (tab === i ? 0 : -1) : undefined,
      'aria-label': `${d.label}: ${d.count.toLocaleString()} (${d.text})${interactive ? ', show these responses' : ''}`,
      style: { ...FRAME, cursor: interactive ? 'pointer' : 'default', ...extraStyle } as CSSProperties,
      onMouseMove: (e: React.MouseEvent) => {
        setActive(i);
        setPos(rel(e.clientX, e.clientY - 8));
      },
      onMouseLeave: () => setActive((a) => (a === i ? null : a)),
      onFocus: (e: React.FocusEvent<Element>) => {
        setActive(i);
        setTab(i);
        const r = e.currentTarget.getBoundingClientRect();
        setPos(rel(r.left + r.width / 2, r.top));
      },
      onBlur: () => setActive((a) => (a === i ? null : a)),
      onClick: () => onSelect?.(d),
      onKeyDown: (e: KeyboardEvent) => {
        const go = (n: number) => {
          e.preventDefault();
          wrapEl?.querySelector<SVGElement | HTMLElement>(`[data-seg="${(n + data.length) % data.length}"]`)?.focus();
        };
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(d);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(i + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(i - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(data.length - 1);
      },
    };
  }

  const w = width;
  const tip =
    active !== null && pos && data[active] ? (
      <div
        role="tooltip"
        className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-(--surface-inverse) px-2 py-1 bg-caption text-(--text-inverse) shadow-md"
        style={{ left: Math.min(Math.max(pos.x, 70), Math.max(w - 70, 70)), top: pos.y, transform: 'translate(-50%, -100%)' }}
      >
        <strong>{data[active].label}</strong> · {data[active].count.toLocaleString()} {data[active].count === 1 ? 'response' : 'responses'} ({data[active].percentage.toFixed(1).replace(/\.0$/, '')}%)
      </div>
    ) : null;

  return { attach, w: width, active, itemProps, tip };
}

function Wrap({ nav, children }: { nav: ReturnType<typeof useChartNav>; children: ReactNode }) {
  // `attach` is a callback ref and `tip` plain state; the react-hooks/refs rule mistakes them for ref objects.
  /* eslint-disable react-hooks/refs */
  return (
    <div ref={nav.attach} className="relative w-full">
      {children}
      {nav.tip}
    </div>
  );
  /* eslint-enable react-hooks/refs */
}

// ── Pie / donut ──────────────────────────────────────────────────────────────

function arc(r0: number, r1: number, a0: number, a1: number): string {
  const pt = (r: number, a: number) => `${(100 + r * Math.cos(a)).toFixed(2)} ${(100 + r * Math.sin(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const outer = `M${pt(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${pt(r1, a1)}`;
  return r0 === 0 ? `${outer} L100 100 Z` : `${outer} L${pt(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${pt(r0, a0)} Z`;
}

export function PieChart({ data, ariaLabel, onSelect, donut, legend = true, centreLabel }: InteractiveChartProps & { donut?: boolean; legend?: boolean; centreLabel?: string }) {
  const shown = data.filter((d) => d.count > 0);
  const nav = useChartNav({ data: shown, ariaLabel, onSelect });
  const w = nav.w;
  const total = shown.reduce((s, d) => s + d.count, 0);
  const size = Math.max(140, Math.min(w, 240));
  const colorOf = (key: string) => seriesColor(data.findIndex((d) => d.key === key));
  const slices = shown.map((d, i) => {
    const before = shown.slice(0, i).reduce((sum, x) => sum + x.count, 0);
    const a0 = -Math.PI / 2 + (total > 0 ? (before / total) * Math.PI * 2 : 0);
    const sweep = total > 0 ? (d.count / total) * Math.PI * 2 : 0;
    return { d, a0, a1: sweep >= Math.PI * 2 ? a0 + Math.PI * 2 - 0.0001 : a0 + sweep, mid: a0 + sweep / 2 };
  });

  return (
    <Wrap nav={nav}>
      <div className="flex flex-col items-center gap-3">
        <svg width={size} height={size} viewBox="0 0 200 200" role="group" aria-label={ariaLabel} className="overflow-visible">
          {slices.map(({ d, a0, a1, mid }, i) => {
            const on = nav.active === i;
            return (
              <path
                key={d.key}
                d={arc(donut ? 58 : 0, 96, a0, a1)}
                fill={colorOf(d.key)}
                stroke={on ? 'var(--text-primary)' : 'var(--surface-card)'}
                strokeWidth={on ? 2.5 : 1.5}
                className="motion-reduce:transition-none"
                {...nav.itemProps(i, { transform: on ? `translate(${Math.cos(mid) * 5}px, ${Math.sin(mid) * 5}px)` : undefined, transition: 'transform 120ms' })}
              />
            );
          })}
          {donut && (
            <g aria-hidden="true" pointerEvents="none">
              <text x="100" y="98" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text-primary)">{total.toLocaleString()}</text>
              <text x="100" y="118" textAnchor="middle" fontSize="11" fill="var(--text-muted)">{centreLabel ?? 'answers'}</text>
            </g>
          )}
        </svg>
        {legend && (
          <ul className="flex w-full flex-wrap justify-center gap-x-4 gap-y-1">
            {data.map((d) => (
              <li key={d.key} className={`inline-flex items-center gap-1.5 bg-caption text-(--text-secondary) ${shown[nav.active ?? -1]?.key === d.key ? 'font-semibold text-(--text-primary)' : ''}`}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colorOf(d.key) }} aria-hidden="true" />
                {d.label} <span className="tabular-nums text-(--text-muted)">{d.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Wrap>
  );
}

// ── Bar (vertical, horizontal) ───────────────────────────────────────────────

const PAD = { top: 18, right: 12, bottom: 30, left: 38 };

export function BarsChart({
  data,
  ariaLabel,
  onSelect,
  horizontal,
  byCategory,
  legend,
  height = 220,
}: InteractiveChartProps & { horizontal?: boolean; byCategory?: boolean; legend?: boolean; height?: number }) {
  const nav = useChartNav({ data, ariaLabel, onSelect });
  const w = nav.w;
  const top = Math.max(...data.map((d) => d.count), 0);
  const axis = niceAxis(top);
  const colorOf = (i: number) => (byCategory ? seriesColor(i) : CHART_COLOR.primary);

  if (horizontal) {
    const rowH = 36;
    const labelW = Math.max(80, Math.min(160, Math.round(w * 0.34)));
    const trackW = Math.max(w - labelW - 56, 20);
    const h = data.length * rowH + 8;
    return (
      <Wrap nav={nav}>
        <svg width={w} height={h} role="group" aria-label={ariaLabel}>
          {data.map((d, i) => {
            const y = 4 + i * rowH;
            const on = nav.active === i;
            return (
              <g key={d.key} {...nav.itemProps(i)}>
                <rect x={0} y={y} width={w} height={rowH} fill={on ? 'var(--surface-hover)' : 'transparent'} rx={6} />
                <text x={4} y={y + rowH / 2 + 4} fontSize="12" fill="var(--text-secondary)">{clip(d.label, Math.floor((labelW - 8) / 6.4))}</text>
                <rect x={labelW} y={y + 9} width={trackW} height={18} rx={4} fill="var(--chart-muted)" />
                <rect x={labelW} y={y + 9} width={top > 0 ? Math.max((d.count / top) * trackW, d.count > 0 ? 3 : 0) : 0} height={18} rx={4} fill={colorOf(i)} stroke={on ? 'var(--text-primary)' : 'none'} strokeWidth={2} />
                <text x={w - 4} y={y + rowH / 2 + 4} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--text-primary)">{d.text}</text>
              </g>
            );
          })}
        </svg>
        {legend && <CategoryLegend data={data} />}
      </Wrap>
    );
  }

  const plotW = w - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length > 0 ? plotW / data.length : plotW;
  const y = (v: number) => PAD.top + plotH - (v / axis.max) * plotH;
  const bw = Math.max(6, Math.min(40, band * 0.62));
  const show = labelIndices(data.length, Math.max(2, Math.floor(plotW / 54)));
  return (
    <Wrap nav={nav}>
      <svg width={w} height={height} role="group" aria-label={ariaLabel}>
        {axis.ticks.map((t) => (
          <g key={t} aria-hidden="true">
            <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = PAD.left + band * i + band / 2;
          const on = nav.active === i;
          return (
            <g key={d.key} {...nav.itemProps(i)}>
              <rect x={cx - band / 2} y={PAD.top} width={band} height={plotH} fill={on ? 'var(--surface-hover)' : 'transparent'} />
              <rect x={cx - bw / 2} y={y(d.count)} width={bw} height={Math.max(y(0) - y(d.count), d.count > 0 ? 2 : 0)} rx={Math.min(5, bw / 2)} fill={colorOf(i)} stroke={on ? 'var(--text-primary)' : 'none'} strokeWidth={2} />
              {band >= 34 && <text x={cx} y={y(d.count) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-primary)" aria-hidden="true">{d.text}</text>}
              {show.has(i) && <text x={cx} y={height - 10} textAnchor="middle" fontSize="11" fill="var(--text-muted)" aria-hidden="true">{clip(d.label, Math.max(3, Math.floor((band * Math.min(2, Math.ceil(data.length / show.size))) / 6.2)))}</text>}
            </g>
          );
        })}
      </svg>
      {legend && byCategory && <CategoryLegend data={data} />}
    </Wrap>
  );
}

function CategoryLegend({ data }: { data: ChartSegment[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {data.map((d, i) => (
        <li key={d.key} className="inline-flex items-center gap-1.5 bg-caption text-(--text-secondary)">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: seriesColor(i) }} aria-hidden="true" />
          {d.label}
        </li>
      ))}
    </ul>
  );
}

// ── Line / area ──────────────────────────────────────────────────────────────

export function LineAreaChart({ data, ariaLabel, onSelect, area, height = 220 }: InteractiveChartProps & { area?: boolean; height?: number }) {
  const gid = useId();
  const nav = useChartNav({ data, ariaLabel, onSelect });
  const w = nav.w;
  const axis = niceAxis(Math.max(...data.map((d) => d.count), 0));
  const plotW = w - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const band = data.length > 0 ? plotW / data.length : plotW;
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + plotH - (v / axis.max) * plotH;
  const pts = data.map((d, i) => [x(i), y(d.count)] as const);
  const show = labelIndices(data.length, Math.max(2, Math.floor(plotW / 62)));
  const line = pts.length > 1 ? curve(pts) : '';
  return (
    <Wrap nav={nav}>
      <svg width={w} height={height} role="group" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: CHART_COLOR.primary, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: CHART_COLOR.primary, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        {axis.ticks.map((t) => (
          <g key={t} aria-hidden="true">
            <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border-subtle)" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{t}</text>
          </g>
        ))}
        {pts.length > 1 && area && <path d={`${line} L${pts[pts.length - 1][0]} ${y(0)} L${pts[0][0]} ${y(0)} Z`} fill={`url(#${gid})`} aria-hidden="true" />}
        {pts.length > 1 && <path d={line} fill="none" stroke={CHART_COLOR.primary} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" />}
        {data.map((d, i) => {
          const on = nav.active === i;
          return (
            <g key={d.key} {...nav.itemProps(i)}>
              <rect x={x(i) - band / 2} y={PAD.top} width={band} height={plotH} fill={on ? 'var(--surface-hover)' : 'transparent'} />
              {(on || data.length <= 24) && <circle cx={x(i)} cy={y(d.count)} r={on ? 6 : 3.5} fill="var(--surface-card)" stroke={CHART_COLOR.primary} strokeWidth="2.5" />}
              {show.has(i) && <text x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="var(--text-muted)" aria-hidden="true">{d.label}</text>}
            </g>
          );
        })}
      </svg>
    </Wrap>
  );
}

// ── Average stat card ────────────────────────────────────────────────────────

export function AverageStat({ mean, n, label, onSelect, ariaLabel }: { mean: string; n: number; label: string; onSelect?: () => void; ariaLabel: string }) {
  const body = (
    <>
      <span className="text-5xl font-bold leading-none tabular-nums text-(--text-primary)">{mean}</span>
      <span className="bg-body-sm text-(--text-secondary)">{label}</span>
      <span className="bg-caption text-(--text-muted)">from {n.toLocaleString()} {n === 1 ? 'response' : 'responses'}</span>
    </>
  );
  const cls = 'flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg p-4 text-center';
  return onSelect ? (
    <button type="button" onClick={onSelect} aria-label={`${ariaLabel}, show these responses`} className={`${cls} cursor-pointer hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--border-focus)`}>
      {body}
    </button>
  ) : (
    <div role="img" aria-label={ariaLabel} className={cls}>{body}</div>
  );
}
