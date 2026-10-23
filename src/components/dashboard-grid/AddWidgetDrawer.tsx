'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { KpiCard, type KpiData, type KpiTone, type KpiVariant } from '@/components/ui/KpiCard';
import { bx } from '@/lib/utils';
import { CHART_LABEL, ChartWidget } from './ChartWidget';
import { MapWidget } from './MapWidget';
import { TONES, chartsFor, isKpi, isLocations, type ChartKind, type MetricMap, type Widget, type WidgetWidth } from './types';

const NAMES: Record<number, string> = {
  1: 'Minimal', 2: 'Solid', 3: 'With bars', 4: 'Progress ring', 5: 'Ring + status', 6: 'Ring + status', 7: 'Icon + change',
  8: 'Two metrics', 9: 'Compact bars', 10: 'Area chart', 11: 'Icon badge', 12: 'Trend + note', 13: 'Icon + value',
  14: 'Progress bar', 15: 'Comparison', 16: 'Mini donut', 17: 'Gradient', 18: 'Two metrics + trend', 19: 'Multi-metric', 20: 'Icon + note',
};
const SIZE_LABEL: Record<WidgetWidth, string> = { 3: 'Small', 4: 'Medium', 6: 'Wide', 12: 'Full width' };
const WIDE: KpiVariant[] = [8, 12, 18, 19];
const chartWidth = (c: ChartKind): WidgetWidth => (c === 'donut' || c === 'pie' || c === 'status' ? 4 : 6);
const defaultWidth = (v: KpiVariant): WidgetWidth => (WIDE.includes(v) ? 6 : 4);

// "Mixed" previews each look in its own colour so the panel isn't a wall of blue; picking one colour applies it to all.
const MIX: KpiTone[] = ['primary', 'success', 'purple', 'warning'];
const SWATCH: Record<KpiTone, string> = {
  primary: 'var(--action-primary)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--error)', purple: '#8B5CF6',
};

/** A look is offered only when the metric has the data it draws — never an invented graph. */
function supports(v: KpiVariant, d: KpiData): boolean {
  if ([3, 9, 10, 12, 15].includes(v)) return !!d.trend && d.trend.length >= 2;
  if ([4, 5, 6, 14, 16].includes(v)) return typeof d.percent === 'number';
  if (v === 8 || v === 18) return !!d.secondary;
  if (v === 19) return !!d.items?.length;
  if (v === 20) return !!d.highlight;
  return true;
}

// Looks that are no longer offered when adding a widget: each is too close to one that stays (Icon + change, Icon badge, Trend + note, Icon + value,
// Comparison, Mini donut, and both "Ring + status" - they differ only in the colour of the status, and look like Progress ring). They are only hidden here - KpiCard still draws them, so a dashboard that already uses one keeps working.
const NOT_OFFERED: KpiVariant[] = [5, 6, 7, 11, 12, 13, 15, 16];
const ALL = Array.from({ length: 20 }, (_, i) => (i + 1) as KpiVariant).filter((v) => !NOT_OFFERED.includes(v));

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 bg-body font-semibold text-(--text-primary)">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-(--action-primary) text-xs text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** One pickable preview: fixed-height frame so every tile lines up, name + size underneath. */
function Tile({ name, size, onPick, children }: { name: string; size: WidgetWidth; onPick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Add ${name}`}
      className="group flex min-w-0 flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors hover:bg-(--surface-hover) focus-visible:outline-2 focus-visible:outline-(--action-primary)"
    >
      <span className="pointer-events-none relative block h-44 overflow-hidden rounded-2xl *:h-full">{children}</span>
      <span className="flex items-center justify-between gap-2 px-1">
        <span className="truncate bg-body-sm font-semibold text-(--text-primary)">{name}</span>
        <span className="flex flex-none items-center gap-1 text-xs text-(--text-muted)">
          {SIZE_LABEL[size]}
          <Plus className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        </span>
      </span>
    </button>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metrics: MetricMap;
  onAdd: (w: Omit<Widget, 'id'>) => void;
}

export function AddWidgetDrawer({ isOpen, onClose, metrics, onAdd }: Props) {
  const keys = Object.keys(metrics);
  const [metric, setMetric] = useState(keys[0]);
  const [tone, setTone] = useState<KpiTone | 'mixed'>('mixed');
  const m = metrics[metric];
  const nameOf = (k: string) => metrics[k]?.label || 'Overview';
  const toneFor = (v: KpiVariant): KpiTone => (tone === 'mixed' ? MIX[(v - 1) % MIX.length] : tone);
  const add = (w: Omit<Widget, 'id'>) => { onAdd(w); onClose(); };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width={760} title="Add widget" description="Choose what to show, then click a style to add it. You can resize, move and recolour it afterwards.">
      <div className="flex flex-col gap-6">
        <Step n={1} title="What do you want to show?">
          <div role="radiogroup" aria-label="Data" className="flex flex-wrap gap-2">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={k === metric}
                onClick={() => setMetric(k)}
                className={bx(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  k === metric ? 'border-(--action-primary) bg-(--action-primary) text-white' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)',
                )}
              >
                {nameOf(k)}
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Pick a style">
          {m && isKpi(m) && (
            <div role="radiogroup" aria-label="Colour" className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-(--text-secondary)">Colour</span>
              <button
                type="button"
                role="radio"
                aria-checked={tone === 'mixed'}
                onClick={() => setTone('mixed')}
                className={bx('rounded-full border px-2.5 py-1 text-xs', tone === 'mixed' ? 'border-(--action-primary) font-semibold text-(--text-primary)' : 'border-(--border-default) text-(--text-secondary)')}
              >
                Mixed
              </button>
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={tone === t.value}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => setTone(t.value)}
                  className={bx('size-6 rounded-full border-2 transition-transform hover:scale-110', tone === t.value ? 'border-(--text-primary)' : 'border-transparent')}
                  style={{ backgroundColor: SWATCH[t.value] }}
                />
              ))}
            </div>
          )}

          {m && isLocations(m) ? (
            <div className="grid grid-cols-1 gap-3">
              <Tile name="Response map" size={12} onPick={() => add({ w: 12, config: { type: 'map', metric } })}>
                <MapWidget metric={m} preview />
              </Tile>
            </div>
          ) : m && !isKpi(m) ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {chartsFor(m).map((chart) => (
                <Tile key={chart} name={CHART_LABEL[chart]} size={chartWidth(chart)} onPick={() => add({ w: chartWidth(chart), config: { type: 'chart', chart, metric } })}>
                  <ChartWidget chart={chart} metric={m} />
                </Tile>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {m && ALL.filter((v) => supports(v, m)).map((v) => (
                <Tile key={v} name={NAMES[v]} size={defaultWidth(v)} onPick={() => add({ w: defaultWidth(v), config: { type: 'kpi', variant: v, metric, tone: toneFor(v) } })}>
                  <KpiCard variant={v} data={{ ...m, tone: toneFor(v) }} />
                </Tile>
              ))}
            </div>
          )}
        </Step>
      </div>
    </Drawer>
  );
}
