'use client';

// Dev demo of the customisable dashboard grid on sample data (non-production only, app/dev/ui/dashboard).
// State is local: Save/Reset here only prove the interaction. Persistence is Phase 2 (backend).
import { useState } from 'react';
import { BarChart3, Calendar, FileText, MessageSquare, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AddWidgetDrawer } from './AddWidgetDrawer';
import { DashboardGrid } from './DashboardGrid';
import type { MetricMap, Widget } from './types';

const METRICS: MetricMap = {
  totalForms: { label: 'Total forms', value: 13, icon: <FileText />, percent: 46, sub: '6 published', delta: { value: '8%', note: 'vs last 30 days' }, trend: [3, 4, 3, 5, 4, 6, 5, 7, 8, 9] },
  totalResponses: { label: 'Total responses', value: 81, icon: <MessageSquare />, delta: { value: '12.5%', note: 'vs last 30 days' }, trend: [2, 4, 3, 7, 6, 11, 9, 14, 18, 22] },
  publishedForms: { label: 'Published forms', value: 6, sub: '/ 13', percent: 46, icon: <BarChart3 /> },
  responsesThisMonth: { label: 'Responses this month', value: 15, icon: <Calendar />, delta: { value: '4%', down: true }, trend: [5, 4, 6, 3, 5, 4, 3] },
  avgPerForm: { label: 'Avg. responses / form', value: '3.2', icon: <BarChart3 />, delta: { value: '128%', note: 'vs previous 30 days' }, secondary: { label: 'Previous period', value: '1.4' }, trend: [1, 1, 2, 2, 3, 3, 3, 4] },
  completionRate: { label: 'Completion rate', value: '86%', icon: <BarChart3 />, percent: 86, status: { label: 'Healthy', tone: 'success' }, sub: 'of people who open a form finish it', highlight: 'Higher than usual', delta: { value: '5%' } },
  overview: { label: '', value: '', items: [{ label: 'Responses', value: 81, icon: <MessageSquare />, tone: 'primary' }, { label: 'Active forms', value: 6, icon: <Calendar />, tone: 'warning' }, { label: 'Members', value: 4, icon: <Users />, tone: 'purple' }] },
  responseTrend: { label: 'Responses over time', series: [2, 1, 3, 1, 1, 3, 1, 2, 1, 2, 4, 1, 4, 4, 9, 1, 4], labels: ['09 Sep', '10 Sep', '11 Sep', '12 Sep', '13 Sep', '14 Sep', '15 Sep', '16 Sep', '17 Sep', '18 Sep', '19 Sep', '20 Sep', '21 Sep', '22 Sep', '23 Sep', '24 Sep', '25 Sep'] },
  formsByStatus: { label: 'Forms by status', segments: [{ label: 'Published', value: 7 }, { label: 'Draft', value: 5 }, { label: 'Closed', value: 1 }] },
  responsesByForm: { label: 'Responses by form', segments: [{ label: 'Event Registration', value: 22 }, { label: 'Customer Survey', value: 17 }, { label: 'Job Application', value: 9 }, { label: 'Feedback', value: 5 }] },
  ticketBreakdown: { label: 'Ticket (question)', segments: [{ label: 'General Admission', value: 9 }, { label: 'Workshop Pass', value: 7 }, { label: 'VIP Pass', value: 6 }] },
};

const DEFAULT: Widget[] = [
  { id: 'a', w: 3, config: { type: 'kpi', variant: 3, metric: 'totalForms' } },
  { id: 'b', w: 3, config: { type: 'kpi', variant: 1, metric: 'totalResponses' } },
  { id: 'c', w: 3, config: { type: 'kpi', variant: 14, metric: 'publishedForms' } },
  { id: 'd', w: 3, config: { type: 'kpi', variant: 9, metric: 'responsesThisMonth' } },
  { id: 'e', w: 6, config: { type: 'chart', chart: 'bar', metric: 'responseTrend' } },
  { id: 'f', w: 6, config: { type: 'chart', chart: 'status', metric: 'formsByStatus' } },
];

let seq = 0;
const uid = () => `w${Date.now().toString(36)}${seq++}`;

export function DashboardDemo() {
  const [saved, setSaved] = useState<Widget[]>(DEFAULT);
  const [draft, setDraft] = useState<Widget[] | null>(null);
  const [adding, setAdding] = useState(false);
  const editing = draft !== null;

  return (
    <div className="mx-auto flex max-w-350 flex-col gap-6 bg-(--bg-page) p-4 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="bg-h2 text-(--text-primary)">Dashboard grid — demo</h1>
          <p className="bg-body text-(--text-muted)">Drag “Move”, change size, remove, add. Sample data, nothing is persisted.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => setAdding(true)}><Plus size={16} className="mr-1" />Add widget</Button>
              <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="secondary" onClick={() => setDraft(DEFAULT)}>Reset to default</Button>
              <Button onClick={() => { setSaved(draft); setDraft(null); }}>Save</Button>
            </>
          ) : (
            <Button onClick={() => setDraft(saved)}>Customize</Button>
          )}
        </div>
      </header>

      <DashboardGrid
        widgets={draft ?? saved}
        metrics={METRICS}
        onChange={editing ? setDraft : undefined}
        empty={<p className="bg-body text-(--text-muted)">No widgets. Click Customize, then Add widget.</p>}
      />

      <AddWidgetDrawer
        isOpen={adding}
        onClose={() => setAdding(false)}
        metrics={METRICS}
        onAdd={(w) => setDraft((d) => [...(d ?? []), { ...w, id: uid() }])}
      />
    </div>
  );
}
