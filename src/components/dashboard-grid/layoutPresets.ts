import type { KpiVariant } from '@/components/ui/KpiCard';
import type { MetricMap, Widget } from './types';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  build: (metrics: MetricMap) => Widget[];
}

type Kind = Extract<Widget['config'], { type: 'chart' }>['chart'];

// Ready-made dashboards. Like the defaults they name WHAT to show and never carry data, and a widget whose metric has no data on this
// dashboard is left out (never drawn empty), so the same preset gives a personal dashboard and a workspace one what each really has.
const kpi = (id: string, metric: string, variant: KpiVariant, w: Widget['w'] = 3): Widget => ({ id, w, config: { type: 'kpi', variant, metric } });
const chart = (id: string, metric: string, kind: Kind, w: Widget['w']): Widget => ({ id, w, config: { type: 'chart', chart: kind, metric } });
const map = (id: string): Widget => ({ id, w: 12, config: { type: 'map', metric: 'responseMap' } });

const has = (m: MetricMap, key: string) => !!m[key];
// the map is only worth a card when there is at least one place to show on it
const hasPlaces = (m: MetricMap) => {
  const v = m.responseMap;
  return !!v && 'points' in v && v.points.length > 0;
};
const responsesVariant = (m: MetricMap): KpiVariant => {
  const v = m.totalResponses;
  return v && 'trend' in v && v.trend ? 1 : 13;
};

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'overview',
    name: 'Overview',
    description: 'The key numbers on top, then responses by form and over time.',
    build: (m) => [
      kpi('l-forms', 'totalForms', 16),
      kpi('l-responses', 'totalResponses', responsesVariant(m)),
      kpi('l-published', 'publishedForms', 14),
      kpi('l-avg', 'avgPerForm', 16),
      chart('l-trend', 'responseTrend', 'bar', 6),
      chart('l-byform', 'responsesByForm', 'hbar', 6),
    ],
  },
  {
    id: 'numbers',
    name: 'Numbers only',
    description: 'A clean row of key figures. Nothing else.',
    build: (m) => [
      kpi('l-forms', 'totalForms', 16),
      kpi('l-responses', 'totalResponses', responsesVariant(m)),
      kpi('l-published', 'publishedForms', 14),
      has(m, 'responsesThisMonth') ? kpi('l-month', 'responsesThisMonth', 16) : kpi('l-avg', 'avgPerForm', 16),
    ],
  },
  {
    id: 'charts',
    name: 'Charts first',
    description: 'A large chart of responses over time, with the breakdowns beside it.',
    build: () => [
      chart('l-trend', 'responseTrend', 'area', 12),
      chart('l-byform', 'responsesByForm', 'hbar', 6),
      chart('l-status', 'formsByStatus', 'donut', 6),
    ],
  },
  {
    id: 'map',
    name: 'Map and trend',
    description: 'Where responses come from, with the trend and two key numbers.',
    build: (m) => [
      kpi('l-responses', 'totalResponses', responsesVariant(m), 6),
      kpi('l-forms', 'totalForms', 16, 6),
      chart('l-trend', 'responseTrend', 'area', 12),
      map('l-map'),
    ],
  },
];

/** The widgets a preset gives THIS dashboard: the ones whose data exists (the map: only when responses have places). */
export function buildLayout(preset: LayoutPreset, metrics: MetricMap): Widget[] {
  return preset.build(metrics).filter((w) => (w.config.type === 'map' ? hasPlaces(metrics) : has(metrics, w.config.metric)));
}
