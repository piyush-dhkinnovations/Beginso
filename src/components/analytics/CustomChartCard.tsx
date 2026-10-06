'use client';

import { AlertCircle, LockKeyhole, Trash2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarChart, ChartCard, CHART_COLOR, DonutWithLegend, LineChart } from '@/components/ui/charts';
import { chartsService } from '@/services/charts';
import { analyticsKeys, type AnalyticsRangeParams } from '@/lib/queryKeys';
import { CHART_GROUP_LABEL, CHART_TYPE_LABEL } from '@/lib/chartOptions';
import type { ChartSeries, ChartType, SavedChart } from '@/types/charts';

const DONUT_COLORS = [CHART_COLOR.primary, CHART_COLOR.success, CHART_COLOR.warning, CHART_COLOR.error, CHART_COLOR.soft];

/** One renderer for a saved chart and for the modal's live preview. Every chart carries a
 * visually-hidden table of its series (requirements §11 - not colour or shape alone). */
export function ChartSeriesView({ chartType, data, title }: { chartType: ChartType; data: ChartSeries; title: string }) {
  const total = data.total;
  return (
    <>
      {chartType === 'bar' && <BarChart data={data.series} ariaLabel={`${title}: bar chart, ${total} responses`} />}
      {chartType === 'line' && <LineChart data={data.series} ariaLabel={`${title}: line chart, ${total} responses`} />}
      {chartType === 'donut' && (
        <DonutWithLegend
          segments={data.series.map((s, i) => ({ label: s.label, value: s.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))}
          size={140}
          percent
        />
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Group</th>
            <th>Responses</th>
          </tr>
        </thead>
        <tbody>
          {data.series.map((s) => (
            <tr key={s.label}>
              <td>{s.label}</td>
              <td>{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

interface CustomChartCardProps {
  formId: string;
  scope: string;
  chart: SavedChart;
  /** Label of the field this chart summarises, resolved from the form (undefined = field gone). */
  fieldLabel?: string;
  range: AnalyticsRangeParams;
  canEdit: boolean;
  onRemove: (chart: SavedChart) => void;
  isRemoving?: boolean;
}

// Sprint 14 (requirements 1.5, task 3.4). Each card owns its own data query, so one chart failing
// shows its own error and never blanks the page (design.md §17 "Partial").
export function CustomChartCard({ formId, scope, chart, fieldLabel, range, canEdit, onRemove, isRemoving }: CustomChartCardProps) {
  const fieldGone = chart.fieldMissing === true;
  const dataQuery = useQuery({
    queryKey: analyticsKeys.chartData(formId, chart._id, range),
    queryFn: () => chartsService.data(formId, chart._id, range, scope),
    enabled: !fieldGone,
  });

  const title = `${fieldLabel ?? 'Chart'} · ${CHART_TYPE_LABEL[chart.chartType]}, ${CHART_GROUP_LABEL[chart.groupBy].toLowerCase()}`;
  const removeButton = canEdit ? (
    <Button variant="ghost" size="small" onClick={() => onRemove(chart)} isLoading={isRemoving} aria-label={`Remove chart ${title}`}>
      <Trash2 size={14} aria-hidden="true" />
    </Button>
  ) : undefined;

  if (fieldGone) {
    return (
      <ChartCard title="Field removed" legend={removeButton}>
        <p className="bg-body-sm text-(--text-muted)">This field no longer exists. Remove this chart to tidy up.</p>
      </ChartCard>
    );
  }

  const status = isAxiosError(dataQuery.error) ? dataQuery.error.response?.status : undefined;
  const hasData = !!dataQuery.data && dataQuery.data.total > 0 && dataQuery.data.series.some((s) => s.value > 0);

  return (
    <ChartCard title={title} legend={removeButton}>
      {dataQuery.isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-(--bg-sunken)" aria-busy="true" aria-label="Loading chart" />
      ) : dataQuery.isError ? (
        status === 403 ? (
          <EmptyState icon={<LockKeyhole />} title="No access" description="You don't have permission to view this chart." />
        ) : (
          <EmptyState
            icon={<AlertCircle />}
            title="Unable to load this chart"
            actions={<Button variant="secondary" size="small" onClick={() => void dataQuery.refetch()}>Try again</Button>}
          />
        )
      ) : !hasData ? (
        <p className="bg-body-sm text-(--text-muted)">No answers yet in this range.</p>
      ) : (
        <ChartSeriesView chartType={chart.chartType} data={dataQuery.data} title={title} />
      )}
    </ChartCard>
  );
}
