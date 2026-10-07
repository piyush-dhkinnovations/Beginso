'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { seriesColor } from '@/components/ui/charts';
import { useToast } from '@/components/ui/Toast';
import { ChartBody } from './ChartBody';
import { DateRangeFilter } from './DateRangeFilter';
import type { DrillTarget } from './ChartView';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useFieldDistribution } from '@/hooks/useFieldDistribution';
import { averageOf, bucketLabel, buildData, CHART_TYPE_LABEL, fieldKind, formatMean } from '@/lib/chartOptions';
import { chartPng, type LegendItem } from '@/lib/exportChart';
import { downloadBlob, toCsv } from '@/lib/csv';
import type { AnalyticsRangeParams } from '@/lib/queryKeys';
import type { SavedChart } from '@/types/charts';
import type { FormField } from '@/types/form';

interface ChartFullScreenProps {
  /** False while a drill-down panel is on top - the overlay stays mounted underneath, so closing the panel returns here. */
  isOpen: boolean;
  chart: SavedChart;
  field?: FormField;
  formId: string;
  scope: string;
  range: AnalyticsRangeParams;
  onClose: () => void;
  onSelect: (target: DrillTarget) => void;
}

interface Row {
  key: string;
  label: string;
  count: number;
  share: string;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'chart';

export function ChartFullScreen({ isOpen, chart, field, formId, scope, range, onClose, onSelect }: ChartFullScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  useFocusTrap(isOpen, onClose, ref);
  const query = useFieldDistribution({ scope, formId, field, range });

  if (!isOpen || typeof document === 'undefined') return null;

  const isDate = field?.type === 'date';
  const data = buildData(chart, field, query.data ?? []);
  const rows: Row[] = data.map((d) => ({ key: d.key, label: isDate ? bucketLabel(d.key) : d.label, count: d.count, share: `${d.percentage.toFixed(1).replace(/\.0$/, '')}%` }));
  const avg = chart.type === 'average' ? averageOf(query.data ?? []) : null;
  const colored = chart.type === 'pie' || chart.type === 'donut' || ((chart.type === 'bar' || chart.type === 'horizontal_bar') && !!field && fieldKind(field) === 'choice');

  function exportCsv() {
    const csv = toCsv([[field?.label ?? 'Answer', 'Responses', 'Share'], ...rows.map((r) => [r.label, r.count, r.share]), ['Total', rows.reduce((s, r) => s + r.count, 0), '']]);
    downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `${slug(chart.title)}.csv`);
  }

  async function exportPng() {
    setBusy(true);
    try {
      const legend: LegendItem[] | undefined = colored ? data.map((d, i) => ({ label: d.label, color: seriesColor(i), text: d.text })) : undefined;
      const svg = chartRef.current?.querySelector<SVGSVGElement>('svg[role="group"]') ?? null;
      const blob = await chartPng({
        svg,
        title: chart.title,
        subtitle: `${CHART_TYPE_LABEL[chart.type]} chart${field ? ` of "${field.label}"` : ''}`,
        legend: chart.type === 'pie' || chart.type === 'donut' ? legend : undefined,
        big: avg ? formatMean(avg.mean) : undefined,
      });
      downloadBlob(blob, `${slug(chart.title)}.png`);
    } catch {
      toast('Could not export the chart as an image.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="chart-fs-title" className="fixed inset-0 z-78 flex flex-col overflow-y-auto bg-(--bg-page)">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-default) bg-(--surface-card) px-4 py-3 md:px-8">
        <div className="min-w-0">
          <h2 id="chart-fs-title" className="truncate bg-h5 font-bold text-(--text-primary)">{chart.title}</h2>
          <p className="bg-caption text-(--text-muted)">{CHART_TYPE_LABEL[chart.type]}{field ? ` · ${field.label}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="small" onClick={() => void exportPng()} isLoading={busy} disabled={!query.data?.length}>
            <Download size={14} className="mr-1.5" aria-hidden="true" />
            PNG
          </Button>
          <Button variant="secondary" size="small" onClick={exportCsv} disabled={!rows.length}>
            <Download size={14} className="mr-1.5" aria-hidden="true" />
            CSV
          </Button>
          <button type="button" onClick={onClose} aria-label="Close full screen" className="bg-btn bg-btn-ghost bg-btn-icon">
            <X size={18} className="bg-icon" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4 md:px-8 md:py-6">
        <DateRangeFilter />
        <div ref={chartRef} className="rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
          <ChartBody def={chart} field={field} query={query} onSelect={onSelect} height={380} skeletonHeight={380} />
        </div>
        <section aria-labelledby="chart-fs-data" className="flex flex-col gap-2">
          <h3 id="chart-fs-data" className="bg-body font-semibold text-(--text-primary)">Data behind this chart</h3>
          {avg && <p className="bg-body-sm text-(--text-secondary)">Average {formatMean(avg.mean)} from {avg.n.toLocaleString()} responses.</p>}
          <Table<Row>
            columns={[
              { key: 'label', header: 'Answer', render: (r) => r.label },
              { key: 'count', header: 'Responses', align: 'right', render: (r) => r.count.toLocaleString() },
              { key: 'share', header: 'Share', align: 'right', render: (r) => r.share },
            ]}
            rows={rows}
            rowKey={(r) => r.key}
            isLoading={query.isLoading}
            emptyState={<p className="bg-body-sm text-(--text-muted)">No answers in this range.</p>}
          />
        </section>
      </div>
    </div>,
    document.body,
  );
}
