'use client';

import { AverageStat, BarsChart, LineAreaChart, PieChart } from '@/components/ui/charts';
import { averageOf, bucketLabel, buildData, CHART_TYPE_LABEL, fieldKind, formatMean } from '@/lib/chartOptions';
import type { ChartDefinition, FieldBucket } from '@/types/charts';
import type { FormField } from '@/types/form';

/** A clicked segment: the filter in plain words, the raw value the server filters on, and the chart's count. */
export interface DrillTarget {
  label: string;
  /** Undefined = "answered this field" (the average stat card). */
  value?: string;
  count: number;
}

interface ChartViewProps {
  def: Pick<ChartDefinition, 'type' | 'options' | 'title'>;
  field?: FormField;
  buckets: FieldBucket[];
  onSelect?: (target: DrillTarget) => void;
  height?: number;
}

/** One renderer for dashboard cards, the drawer preview and full screen. Also emits a visually-hidden table of
 * the exact figures, so a chart is never colour or shape alone. */
export function ChartView({ def, field, buckets, onSelect, height }: ChartViewProps) {
  const data = buildData(def, field, buckets);
  const total = data.reduce((s, d) => s + d.count, 0);
  const label = `${def.title}: ${CHART_TYPE_LABEL[def.type].toLowerCase()} chart, ${total.toLocaleString()} answers`;
  const isDate = field?.type === 'date';
  const select = onSelect
    ? (d: { key: string; label: string; count: number }) => onSelect({ label: isDate ? bucketLabel(d.key) : d.label, value: d.key, count: d.count })
    : undefined;
  const showLegend = def.options.legend && field !== undefined && fieldKind(field) === 'choice';

  let chart;
  if (def.type === 'average') {
    const avg = averageOf(buckets);
    chart = avg ? (
      <AverageStat
        mean={formatMean(avg.mean)}
        n={avg.n}
        label={`Average ${field?.label ?? 'answer'}`}
        ariaLabel={`${def.title}: average ${formatMean(avg.mean)} from ${avg.n} responses`}
        onSelect={onSelect ? () => onSelect({ label: `Answered ${field?.label ?? 'this question'}`, count: avg.n }) : undefined}
      />
    ) : (
      <p className="bg-body-sm text-(--text-muted)">No numeric answers in this range.</p>
    );
  } else if (def.type === 'pie' || def.type === 'donut') {
    chart = <PieChart data={data} ariaLabel={label} onSelect={select} donut={def.type === 'donut'} legend={showLegend} />;
  } else if (def.type === 'bar' || def.type === 'horizontal_bar') {
    chart = (
      <BarsChart data={data} ariaLabel={label} onSelect={select} horizontal={def.type === 'horizontal_bar'} byCategory={!!field && fieldKind(field) === 'choice'} legend={showLegend} height={height} />
    );
  } else if (def.type === 'bar_time') {
    chart = <BarsChart data={data} ariaLabel={label} onSelect={select} height={height} />;
  } else {
    chart = <LineAreaChart data={data} ariaLabel={label} onSelect={select} area={def.type === 'area'} height={height} />;
  }

  return (
    <>
      {chart}
      <table className="sr-only">
        <caption>{def.title}</caption>
        <thead>
          <tr>
            <th>{field?.label ?? 'Answer'}</th>
            <th>Responses</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{isDate ? bucketLabel(d.key) : d.label}</td>
              <td>{d.count}</td>
              <td>{d.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
