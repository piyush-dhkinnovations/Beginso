import { createElement } from 'react';
import { BarChart3, FileText, MessageSquare } from 'lucide-react';
import type { Role } from '@/types/workspace';
import type { ResponseLocation } from '@/types/dashboard';
import { responseMapMetric } from './personalHome';
import type { MetricMap, Widget } from './types';

interface FormRow { _id: string; title: string; status: string; responseCount?: number }

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const icon = (I: typeof FileText) => createElement(I, { 'aria-hidden': true });

// Everything here is derived from the forms list the Workspace Home already fetches — no new calls.
// A missing key renders as "unavailable", never as an invented number.
export function workspaceMetrics(forms: FormRow[], total: number, locations?: ResponseLocation[]): MetricMap {
  const m: MetricMap = {};
  const responses = forms.reduce((s, f) => s + (f.responseCount ?? 0), 0);
  const published = forms.filter((f) => f.status === 'published').length;
  const closed = forms.filter((f) => f.status === 'closed').length;

  m.totalForms = { label: 'Total Forms', value: total, icon: icon(FileText), percent: pct(published, forms.length), sub: total === forms.length ? `${published} of ${total} published` : `${published} published` };
  m.totalResponses = { label: 'Total Responses', value: responses, icon: icon(MessageSquare) };
  m.publishedForms = { label: 'Active Forms', value: published, sub: `/ ${forms.length}`, percent: pct(published, forms.length), icon: icon(BarChart3) };
  if (forms.length > 0) {
    m.avgPerForm = { label: 'Avg. responses / form', value: (responses / forms.length).toFixed(1), icon: icon(BarChart3) };
    m.formsByStatus = {
      label: 'Forms by status',
      segments: [
        { label: 'Published', value: published },
        { label: 'Draft', value: forms.length - published - closed },
        { label: 'Closed', value: closed },
      ].filter((s) => s.value > 0),
    };
  }
  const top = forms.filter((f) => (f.responseCount ?? 0) > 0).sort((a, b) => (b.responseCount ?? 0) - (a.responseCount ?? 0)).slice(0, 5);
  if (top.length > 0) m.responsesByForm = { label: 'Responses by form', segments: top.map((f) => ({ label: f.title, value: f.responseCount ?? 0 })) };
  if (locations) m.responseMap = responseMapMetric(locations, responses);
  return m;
}

/** Role-based layout for members who never customised; widgets with no data are left out. */
export function workspaceDefaults(metrics: MetricMap, role: Role | undefined): Widget[] {
  const kpi = (id: string, metric: string, variant: 13 | 14 | 16): Widget => ({ id, w: 3, config: { type: 'kpi', variant, metric } });
  const chart = (id: string, metric: string, chart: 'bar' | 'hbar' | 'status' | 'donut', w: 4 | 6): Widget => ({ id, w, config: { type: 'chart', chart, metric } });

  let all: Widget[];
  if (role === 'viewer' || role === 'reviewer') {
    all = [kpi('d-forms', 'totalForms', 16), kpi('d-responses', 'totalResponses', 13)];
  } else if (role === 'member' || role === 'editor') {
    all = [
      kpi('d-responses', 'totalResponses', 13),
      kpi('d-forms', 'totalForms', 16),
      kpi('d-avg', 'avgPerForm', 14),
      chart('d-byform', 'responsesByForm', 'hbar', 6),
      chart('d-status', 'formsByStatus', 'donut', 6),
    ];
  } else {
    all = [
      kpi('d-forms', 'totalForms', 16),
      kpi('d-responses', 'totalResponses', 13),
      kpi('d-published', 'publishedForms', 14),
      kpi('d-avg', 'avgPerForm', 16),
      chart('d-byform', 'responsesByForm', 'hbar', 6),
      chart('d-status', 'formsByStatus', 'status', 6),
    ];
  }
  return all.filter((w) => metrics[w.config.metric]);
}
