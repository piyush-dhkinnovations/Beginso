import { createElement } from 'react';
import { BarChart3, Calendar, FileText, MessageSquare } from 'lucide-react';
import type { KpiData } from '@/components/ui/KpiCard';
import type { MetricMap, Widget } from './types';

interface Counts { totalForms: number; publishedForms: number; totalResponses: number; responsesThisMonth: number }
interface FormRow { _id: string; title: string; responseCount: number }

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const icon = (I: typeof FileText) => createElement(I, { 'aria-hidden': true });

/** The last `n` calendar days ending today, as "09 Sep" labels (oldest first). */
function dayLabels(n: number): string[] {
  const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - (n - 1 - i) * 86_400_000)));
}

// What a dashboard can show on the personal Home. Only metrics the data truly supports are present —
// a missing key renders as "unavailable", never as an invented number.
export function personalMetrics(counts: Counts | undefined, dailyResponses: number[] | undefined, forms: FormRow[]): MetricMap {
  const m: MetricMap = {};
  if (!counts) return m;
  const hasTrend = !!dailyResponses && dailyResponses.some((v) => v > 0);

  m.totalForms = { label: 'Total forms', value: counts.totalForms, icon: icon(FileText), percent: pct(counts.publishedForms, counts.totalForms), sub: `${counts.publishedForms} published` } satisfies KpiData;
  m.totalResponses = { label: 'Total responses', value: counts.totalResponses, icon: icon(MessageSquare), trend: hasTrend ? dailyResponses : undefined };
  m.publishedForms = { label: 'Published forms', value: counts.publishedForms, sub: `/ ${counts.totalForms}`, percent: pct(counts.publishedForms, counts.totalForms), icon: icon(BarChart3) };
  m.responsesThisMonth = { label: 'Responses this month', value: counts.responsesThisMonth, icon: icon(Calendar), percent: pct(counts.responsesThisMonth, counts.totalResponses), sub: 'of all responses' };
  if (counts.totalForms > 0) {
    m.avgPerForm = { label: 'Avg. responses / form', value: (counts.totalResponses / counts.totalForms).toFixed(1), icon: icon(BarChart3) };
  }
  if (hasTrend) m.responseTrend = { label: 'Responses over time', series: dailyResponses!, labels: dayLabels(dailyResponses!.length) };
  if (counts.totalForms > 0) {
    m.formsByStatus = { label: 'Forms by status', segments: [{ label: 'Published', value: counts.publishedForms }, { label: 'Not published', value: Math.max(counts.totalForms - counts.publishedForms, 0) }] };
  }
  const top = [...forms].filter((f) => f.responseCount > 0).sort((a, b) => b.responseCount - a.responseCount).slice(0, 5);
  if (top.length > 0) m.responsesByForm = { label: 'Responses by form', segments: top.map((f) => ({ label: f.title, value: f.responseCount })) };
  return m;
}

/** Layout for users who never customised. Widgets whose metric has no data are left out, not shown empty. */
export function personalDefaults(metrics: MetricMap): Widget[] {
  const all: Widget[] = [
    { id: 'd-forms', w: 3, config: { type: 'kpi', variant: 16, metric: 'totalForms' } },
    { id: 'd-responses', w: 3, config: { type: 'kpi', variant: metrics.totalResponses && 'trend' in metrics.totalResponses && metrics.totalResponses.trend ? 1 : 13, metric: 'totalResponses' } },
    { id: 'd-published', w: 3, config: { type: 'kpi', variant: 14, metric: 'publishedForms' } },
    { id: 'd-month', w: 3, config: { type: 'kpi', variant: 16, metric: 'responsesThisMonth' } },
    { id: 'd-trend', w: 6, config: { type: 'chart', chart: 'bar', metric: 'responseTrend' } },
    { id: 'd-byform', w: 6, config: { type: 'chart', chart: 'hbar', metric: 'responsesByForm' } },
  ];
  return all.filter((w) => metrics[w.config.metric]);
}
