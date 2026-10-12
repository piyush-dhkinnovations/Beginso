'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, CircleDot, TrendingUp, Zap } from 'lucide-react';
import { bx } from '@/lib/utils';
import { Ring } from './charts';
import { curve, scalePoints } from './charts/math';

// One KPI card, 20 looks. Every look is driven by the same KpiData; a look uses what it needs and
// falls back gracefully when a field is missing (no trend -> no sparkline, never an invented one).

export type KpiTone = 'primary' | 'success' | 'warning' | 'error' | 'purple';
export type KpiVariant =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface KpiData {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: KpiTone;
  /** Change vs a previous period. `value` is pre-formatted, e.g. "12.5%". */
  delta?: { value: string; down?: boolean; note?: string };
  /** Values oldest -> newest, drives sparkline / area / bars. */
  trend?: number[];
  /** 0-100, drives rings and progress. */
  percent?: number;
  /** Words beside a ring, e.g. { label: 'Healthy', tone: 'success' }. */
  status?: { label: string; tone: KpiTone };
  /** Muted text next to / under the value, e.g. "/ 20", "1,284 of 2,000", "vs 1,038 last period". */
  sub?: string;
  /** Small chip, e.g. "Last 30 days". */
  period?: string;
  /** Second metric for the two-column looks. */
  secondary?: { label: string; value: string | number; delta?: { value: string; down?: boolean } };
  /** Strip of metrics for look 19. */
  items?: { label: string; value: string | number; icon?: ReactNode; tone?: KpiTone }[];
  /** Footer line for looks 12 / 20, e.g. "Higher than usual". */
  highlight?: string;
  /** Muted line shown instead of an empty ring / bar / sparkline when there is no data yet, e.g. "No responses yet". */
  emptyHint?: string;
}

export interface KpiCardProps {
  variant: KpiVariant;
  data: KpiData;
  className?: string;
}

const TONE: Record<KpiTone, string> = {
  primary: 'var(--action-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
  purple: '#8B5CF6',
};
const TEXT: Record<KpiTone, string> = {
  primary: 'var(--action-primary)',
  success: 'var(--success-text)',
  warning: 'var(--warning-text)',
  error: 'var(--error-text)',
  purple: '#7C3AED',
};
const tint = (t: KpiTone, pct = 12) => `color-mix(in srgb, ${TONE[t]} ${pct}%, transparent)`;

const valueCls = 'text-3xl font-semibold leading-9 tracking-tight text-(--text-primary) tabular-nums';
const labelCls = 'text-sm font-medium leading-5 text-(--text-secondary)';
const mutedCls = 'text-xs leading-4 text-(--text-muted)';

function Shell({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={bx('relative h-full min-h-34 min-w-0 overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-card) p-5', className)}
      style={style}
    >
      {children}
    </div>
  );
}

function Tile({ tone, size = 'md', round, children }: { tone: KpiTone; size?: 'sm' | 'md' | 'lg'; round?: boolean; children: ReactNode }) {
  // A quiet outlined icon square (not a pastel-filled one): the colour lives in the glyph only.
  const dim = { sm: 'size-8 [&_svg]:size-4', md: 'size-10 [&_svg]:size-5', lg: 'size-12 [&_svg]:size-6' }[size];
  return (
    <span
      className={bx('inline-flex flex-none items-center justify-center border border-(--border-default) bg-(--surface-card)', dim, round ? 'rounded-full' : 'rounded-lg')}
      style={{ color: TONE[tone] }}
    >
      {children}
    </span>
  );
}

function Pill({ value, down }: { value: string; down?: boolean }) {
  const t: KpiTone = down ? 'error' : 'success';
  const Icon = down ? ArrowDown : ArrowUp;
  return (
    <span className="inline-flex w-fit flex-none items-center gap-0.5 text-xs font-semibold leading-4" style={{ color: TEXT[t] }}>
      <Icon className="size-3" strokeWidth={2.5} />
      {value}
    </span>
  );
}

function DeltaText({ value, down, note }: { value: string; down?: boolean; note?: string }) {
  const t: KpiTone = down ? 'error' : 'success';
  const Icon = down ? ArrowDown : ArrowUp;
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-4">
      <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: TEXT[t] }}>
        <Icon className="size-3" strokeWidth={2.5} />
        {value}
      </span>
      {note && <span className="text-(--text-muted)">{note}</span>}
    </span>
  );
}

function DeltaRow({ d }: { d?: KpiData['delta'] }) {
  if (!d) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Pill value={d.value} down={d.down} />
      {d.note && <span className={mutedCls}>{d.note}</span>}
    </span>
  );
}

function Spark({ values, tone = 'primary', fill = true, className }: { values: number[]; tone?: KpiTone; fill?: boolean; className?: string }) {
  const gid = useId();
  const w = 120;
  const h = 48;
  const pts = scalePoints(values, w, h);
  if (pts.length < 2) return null;
  const line = curve(pts);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: TONE[tone], stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: TONE[tone], stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {fill && <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={TONE[tone]} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function GradBars({ values, tone = 'primary', className }: { values: number[]; tone?: KpiTone; className?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className={bx('flex flex-none items-end gap-1.5', className)} aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className="w-2.5 rounded-full"
          style={{ height: `${Math.max(16, (v / max) * 100)}%`, backgroundColor: TONE[tone], opacity: 0.2 + (0.8 * (i + 1)) / values.length }}
        />
      ))}
    </div>
  );
}

function Divider() {
  return <span className="w-px flex-none self-stretch bg-(--border-default)" aria-hidden="true" />;
}

function Note({ tone, icon, children }: { tone: KpiTone; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium" style={{ backgroundColor: tint(tone, 11), color: TEXT[tone] }}>
      <span className="flex-none [&_svg]:size-3.5">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// A trend with < 2 points or all zeros has no shape to draw, so it is dropped rather than drawn flat.
const usableTrend = (v: number[] | undefined) => (v && v.length >= 2 && v.some((n) => n !== 0) ? v : undefined);
const lastN = (v: number[] | undefined, n: number) => v?.slice(-n);
const isZeroish = (v: string | number) => parseFloat(String(v).replace(/[^\d.-]/g, '')) === 0;

function Hint({ children }: { children?: string }) {
  return children ? <div className={bx(mutedCls, 'mt-0.5')}>{children}</div> : null;
}

function Render({ variant, d: raw }: { variant: KpiVariant; d: KpiData }) {
  const trend = usableTrend(raw.trend);
  const d: KpiData = { ...raw, trend };
  const tone = d.tone ?? 'primary';
  const pct = Math.min(100, Math.max(0, d.percent ?? 0));
  const bars = lastN(trend, 6);
  const Icon = d.icon;
  // Nothing real for a ring/progress to show: no percent given, or 0% of a zero value.
  const noRing = d.percent === undefined || (pct === 0 && isZeroish(d.value));
  const hint = d.emptyHint && isZeroish(d.value) ? d.emptyHint : undefined;
  // Trend looks: say why there is no graphic instead of leaving a silent gap.
  const trendHint = !trend ? hint : undefined;

  switch (variant) {
    case 1:
      return (
        <Shell className="flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            {Icon ? <Tile tone={tone}>{Icon}</Tile> : <span />}
            {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0"><div className={valueCls}>{d.value}</div><div className={labelCls}>{d.label}</div><Hint>{trendHint}</Hint></div>
            {d.trend && <Spark values={d.trend} tone={tone} className="h-12 w-28 flex-none" />}
          </div>
        </Shell>
      );
    case 2:
      return (
        <Shell className="flex flex-col justify-between gap-3 border-transparent text-white" style={{ background: tone === 'primary' ? 'linear-gradient(135deg, var(--primary-500, #3C69CC), var(--primary-700, #2A4A99))' : `linear-gradient(135deg, ${TONE[tone]}, color-mix(in srgb, ${TONE[tone]} 65%, black))` }}>
          <span className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-12 right-10 size-28 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="text-sm text-white/85">{d.label}</span>
            {Icon && <span className="text-white/85 [&_svg]:size-5">{Icon}</span>}
          </div>
          <div className="relative text-[34px] font-bold leading-10 tracking-tight tabular-nums">{d.value}</div>
          {d.delta && (
            <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
              {d.delta.down ? <ArrowDown className="size-3" strokeWidth={2.5} /> : <ArrowUp className="size-3" strokeWidth={2.5} />}
              {d.delta.value}{d.delta.note ? ` ${d.delta.note}` : ''}
            </span>
          )}
        </Shell>
      );
    case 3:
      return (
        <Shell className="flex items-center gap-4">
          {Icon && <Tile tone={tone}>{Icon}</Tile>}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={labelCls}>{d.label}</span>
            <span className={valueCls}>{d.value}</span>
            <DeltaRow d={d.delta} />
            <Hint>{trendHint}</Hint>
          </div>
          {bars && <GradBars values={bars} tone={tone} className="h-20" />}
        </Shell>
      );
    case 4:
      return (
        <Shell className="flex items-center gap-5">
          {noRing ? (Icon && <Tile tone={tone} size="lg">{Icon}</Tile>) : (
            <Ring percent={pct} size={112} stroke={9} color={TONE[tone]}>
              <span className="text-lg font-bold text-(--text-primary)">{Math.round(pct)}%</span>
            </Ring>
          )}
          <div className="min-w-0">
            <div className={valueCls}>{d.value}</div>
            <div className={labelCls}>{d.label}</div>
            {noRing && hint ? <Hint>{hint}</Hint> : d.sub && <div className="mt-1 text-[13px] text-(--text-muted)">{d.sub}</div>}
          </div>
        </Shell>
      );
    case 5:
    case 6: {
      const st = d.status ?? { label: '', tone };
      return (
        <Shell className="flex items-center gap-4">
          {noRing ? (Icon && <Tile tone={tone} size="lg">{Icon}</Tile>) : (
            <Ring percent={pct} size={96} stroke={10} color={TONE[st.tone]}>
              <span className="text-base font-bold text-(--text-primary)">{Math.round(pct)}%</span>
            </Ring>
          )}
          <div className="min-w-0">
            <div className={labelCls}>{d.label}</div>
            {noRing && <div className={valueCls}>{d.value}</div>}
            {noRing && <Hint>{hint}</Hint>}
            {st.label && <div className="text-[15px] font-semibold leading-6" style={{ color: TEXT[st.tone] }}>{st.label}</div>}
            {d.sub && <div className={bx(mutedCls, 'mt-0.5')}>{d.sub}</div>}
          </div>
        </Shell>
      );
    }
    case 7:
      return (
        <Shell className="flex items-center gap-4">
          {Icon && <Tile tone={d.delta?.down ? 'error' : tone} size="lg">{Icon}</Tile>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={valueCls}>{d.value}</span>
            <span className={labelCls}>{d.label}</span>
            <span className="mt-1"><DeltaRow d={d.delta} /></span>
          </div>
        </Shell>
      );
    case 8:
    case 18: {
      const s = d.secondary;
      return (
        <Shell className="flex items-stretch gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={labelCls}>{d.label}</span>
            <span className={valueCls}>{d.value}</span>
            {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
          </div>
          {s && (
            <>
              <Divider />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={labelCls}>{s.label}</span>
                <span className="flex items-center gap-2">
                  <span className={valueCls}>{s.value}</span>
                  {variant === 18 && <TrendingUp className="size-5 flex-none" style={{ color: TONE[tone] }} />}
                </span>
                {s.delta && <Pill value={s.delta.value} down={s.delta.down} />}
              </div>
            </>
          )}
        </Shell>
      );
    }
    case 9:
      return (
        <Shell className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>{d.label}</span>
            <span className={valueCls}>{d.value}</span>
            {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
            <Hint>{trendHint}</Hint>
          </div>
          {bars && <GradBars values={bars} tone={tone} className="h-20" />}
        </Shell>
      );
    case 10:
      return (
        <Shell className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>{d.label}</span>
            <span className={valueCls}>{d.value}</span>
            <DeltaRow d={d.delta} />
            <Hint>{trendHint}</Hint>
          </div>
          {d.trend && <Spark values={d.trend} tone={tone} className="h-20 w-36 max-w-40 min-w-0 flex-1" />}
        </Shell>
      );
    case 11:
      return (
        <Shell className="flex flex-col justify-center gap-5">
          <div className="flex items-center gap-4">
            {Icon && <Tile tone={tone} size="lg" round>{Icon}</Tile>}
            <div className="min-w-0"><div className={valueCls}>{d.value}</div><div className={labelCls}>{d.label}</div></div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {d.delta ? <Pill value={d.delta.value} down={d.delta.down} /> : <span />}
            {d.period && <span className="rounded-md bg-(--surface-hover) px-2 py-0.5 text-xs text-(--text-secondary)">{d.period}</span>}
          </div>
        </Shell>
      );
    case 12:
      return (
        <Shell className="flex flex-col justify-between gap-3">
          <div className="flex items-stretch gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={labelCls}>{d.label}</span>
              <span className={valueCls}>{d.value}</span>
              {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
              <Hint>{trendHint}</Hint>
            </div>
            {d.trend && (
              <>
                <Divider />
                <div className="flex min-w-0 flex-1 items-center"><Spark values={d.trend} tone="success" className="h-14 w-full" /></div>
              </>
            )}
          </div>
          {d.highlight && <Note tone="success" icon={<CircleDot />}>{d.highlight}</Note>}
        </Shell>
      );
    case 13:
      return (
        <Shell className="flex items-center gap-4">
          {Icon && <Tile tone={tone} size="lg">{Icon}</Tile>}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={valueCls}>{d.value}</span>
            <span className={labelCls}>{d.label}</span>
            {d.delta && <DeltaText value={d.delta.value} down={d.delta.down} note={d.delta.note} />}
            <Hint>{hint}</Hint>
          </div>
        </Shell>
      );
    case 14:
      return (
        <Shell className="flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <span className={labelCls}>{d.label}</span>
            {Icon && <Tile tone={tone} size="sm">{Icon}</Tile>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={valueCls}>{d.value}</span>
            {d.sub && <span className="text-base text-(--text-muted)">{d.sub}</span>}
          </div>
          {noRing ? (
            <div className="flex h-2 items-center"><span className={mutedCls}>{hint}</span></div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: tint(tone, 14) }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: TONE[tone] }} />
              </div>
              <span className="text-[13px] font-semibold text-(--text-primary)">{Math.round(pct)}%</span>
            </div>
          )}
        </Shell>
      );
    case 15:
      return (
        <Shell className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>{d.label}</span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={valueCls}>{d.value}</span>
              {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
            </span>
            {d.sub && <span className={mutedCls}>{d.sub}</span>}
            <Hint>{trendHint}</Hint>
          </div>
          {bars && <GradBars values={bars.slice(-5)} tone={tone} className="h-20" />}
        </Shell>
      );
    case 16:
      return (
        <Shell className="flex items-center gap-4">
          {noRing ? (Icon && <Tile tone={tone} size="lg">{Icon}</Tile>) : (
            <Ring percent={pct} size={84} stroke={10} color={TONE[tone]}>
              <span className="text-sm font-bold text-(--text-primary)">{Math.round(pct)}%</span>
            </Ring>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className={valueCls}>{d.value}</span>
            <span className={labelCls}>{d.label}</span>
            {d.delta && <Pill value={d.delta.value} down={d.delta.down} />}
            {noRing && <Hint>{hint}</Hint>}
          </div>
        </Shell>
      );
    case 17:
      return (
        <Shell className="flex items-center gap-4 border-transparent" style={{ background: `linear-gradient(135deg, ${tint(tone, 16)}, ${tint(tone, 4)})` }}>
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 28 C30 8 60 40 100 22 S160 6 200 20 L200 40 L0 40 Z" fill={tint(tone, 9)} />
          </svg>
          {Icon && (
            <span className="relative inline-flex size-12 flex-none items-center justify-center rounded-xl bg-(--surface-card) shadow-sm [&_svg]:size-6" style={{ color: TONE[tone] }}>{Icon}</span>
          )}
          <div className="relative flex min-w-0 flex-col gap-0.5">
            <span className={labelCls}>{d.label}</span>
            <span className={valueCls}>{d.value}</span>
            {d.delta && <DeltaText value={d.delta.value} down={d.delta.down} note={d.delta.note} />}
          </div>
        </Shell>
      );
    case 19:
      return (
        <Shell className="flex items-stretch gap-3 px-3">
          {(d.items ?? []).map((it, i) => (
            <div key={it.label} className="contents">
              {i > 0 && <Divider />}
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
                {it.icon && <Tile tone={it.tone ?? 'primary'} size="sm">{it.icon}</Tile>}
                <span className="text-xl font-bold leading-7 tabular-nums text-(--text-primary)">{it.value}</span>
                <span className="max-w-full truncate text-xs text-(--text-secondary)">{it.label}</span>
              </div>
            </div>
          ))}
        </Shell>
      );
    case 20:
      return (
        <Shell className="flex flex-col justify-between gap-3">
          <div className="flex items-start gap-4">
            {Icon && <Tile tone="success" size="lg">{Icon}</Tile>}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={valueCls}>{d.value}</span>
              <span className={labelCls}>{d.label}</span>
              {d.delta && <DeltaText value={d.delta.value} down={d.delta.down} />}
            </div>
            <ChevronRight className="size-5 flex-none text-(--text-muted)" />
          </div>
          {d.highlight && <Note tone="success" icon={<Zap />}>{d.highlight}</Note>}
        </Shell>
      );
  }
}

export function KpiCard({ variant, data, className }: KpiCardProps) {
  return (
    <div className={bx('h-full min-w-0', className)}>
      <Render variant={variant} d={data} />
    </div>
  );
}
