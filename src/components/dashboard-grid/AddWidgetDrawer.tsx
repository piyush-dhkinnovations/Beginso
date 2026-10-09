'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { KpiCard, type KpiData, type KpiVariant } from '@/components/ui/KpiCard';
import { CHART_LABEL, ChartWidget } from './ChartWidget';
import { bx } from '@/lib/utils';
import { chartsFor, isKpi, type ChartKind, type MetricMap, type Widget, type WidgetWidth } from './types';

const NAMES: Record<number, string> = {
  1: 'Minimal', 2: 'Solid brand', 3: 'Bars', 4: 'Progress ring', 5: 'Ring + status', 6: 'Ring + status', 7: 'Icon + delta',
  8: 'Two columns', 9: 'Compact bars', 10: 'Area chart', 11: 'Icon badge', 12: 'Split trend', 13: 'Icon + value',
  14: 'Progress bar', 15: 'Comparison', 16: 'Mini donut', 17: 'Gradient', 18: 'Secondary metric', 19: 'Multi-metric', 20: 'Icon list',
};
const WIDE: KpiVariant[] = [8, 12, 18, 19];
const chartWidth = (c: ChartKind): WidgetWidth => (c === 'donut' || c === 'pie' || c === 'status' ? 4 : 6);
const defaultWidth = (v: KpiVariant): WidgetWidth => (WIDE.includes(v) ? 6 : 4);

/** A look is offered only when the metric has the data it draws — never an invented graph. */
function supports(v: KpiVariant, d: KpiData): boolean {
  if ([3, 9, 10, 12, 15].includes(v)) return !!d.trend && d.trend.length >= 2;
  if ([4, 5, 6, 14, 16].includes(v)) return typeof d.percent === 'number';
  if (v === 8 || v === 18) return !!d.secondary;
  if (v === 19) return !!d.items?.length;
  if (v === 20) return !!d.highlight;
  return true;
}

const ALL = Array.from({ length: 20 }, (_, i) => (i + 1) as KpiVariant);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metrics: MetricMap;
  onAdd: (w: Omit<Widget, 'id'>) => void;
}

export function AddWidgetDrawer({ isOpen, onClose, metrics, onAdd }: Props) {
  const keys = Object.keys(metrics);
  const [metric, setMetric] = useState(keys[0]);
  const m = metrics[metric];
  const nameOf = (k: string) => metrics[k]?.label || 'Overview';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width={720} title="Add widget" description="Pick what to show, then a style. Click a card to add it.">
      <div className="flex flex-col gap-5">
        <div role="radiogroup" aria-label="Metric" className="flex flex-wrap gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={k === metric}
              onClick={() => setMetric(k)}
              className={bx('rounded-full border px-3 py-1 text-sm', k === metric ? 'border-(--action-primary) bg-(--action-primary) text-white' : 'border-(--border-default) text-(--text-secondary) hover:bg-(--surface-hover)')}
            >
              {nameOf(k)}
            </button>
          ))}
        </div>

        {m && !isKpi(m) ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {chartsFor(m).map((chart) => (
              <button
                key={chart}
                type="button"
                onClick={() => { onAdd({ w: chartWidth(chart), config: { type: 'chart', chart, metric } }); onClose(); }}
                className="group flex min-w-0 flex-col gap-1.5 rounded-2xl text-left outline-offset-2 focus-visible:outline-2"
              >
                <span className="pointer-events-none block transition-transform group-hover:-translate-y-0.5"><ChartWidget chart={chart} metric={m} /></span>
                <span className="bg-body-sm font-semibold text-(--text-secondary)">{CHART_LABEL[chart]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {m && ALL.filter((v) => supports(v, m)).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { onAdd({ w: defaultWidth(v), config: { type: 'kpi', variant: v, metric } }); onClose(); }}
                className="group flex min-w-0 flex-col gap-1.5 rounded-2xl text-left outline-offset-2 focus-visible:outline-2"
              >
                <span className="pointer-events-none block transition-transform group-hover:-translate-y-0.5"><KpiCard variant={v} data={m} /></span>
                <span className="bg-body-sm font-semibold text-(--text-secondary)">{NAMES[v]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
