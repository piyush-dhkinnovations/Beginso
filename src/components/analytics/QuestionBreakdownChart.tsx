'use client';

import { Card } from '@/components/ui/Card';
import { EChartContainer } from '@/components/charts/EChartContainer';
import { getBaseChartOption, CHART_COLORS, type EChartsOption } from '@/lib/chartTheme';
import type { QuestionBreakdown, QuestionOption } from '@/types/analytics';

const CHART_HEIGHT = 220;

export interface QuestionOptionWithPercentage extends QuestionOption {
  percentage: number;
}

/**
 * Percentages via the largest-remainder method — naive per-option rounding can drift the sum
 * away from 100 once there are more than a couple of options; this guarantees an exact 100 (for
 * any non-empty, non-all-zero input), comfortably inside Correctness Property 3's ±1 tolerance.
 */
export function computeOptionPercentages(options: QuestionOption[]): QuestionOptionWithPercentage[] {
  const total = options.reduce((sum, o) => sum + o.count, 0);
  if (total === 0) return options.map((o) => ({ ...o, percentage: 0 }));

  const raw = options.map((o) => (o.count / total) * 100);
  const rounded = raw.map(Math.floor);
  let remainder = 100 - rounded.reduce((a, b) => a + b, 0);

  const byRemainingFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < byRemainingFraction.length && remainder > 0; i++, remainder--) {
    rounded[byRemainingFraction[i].index] += 1;
  }

  return options.map((o, i) => ({ ...o, percentage: rounded[i] }));
}

function buildBarOption(sorted: QuestionOptionWithPercentage[]): EChartsOption {
  const base = getBaseChartOption();
  return {
    ...base,
    grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', minInterval: 1, show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: sorted.map((o) => o.option),
      axisLabel: { width: 100, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((o) => o.count),
        color: CHART_COLORS.brand,
        label: {
          show: true,
          position: 'right',
          formatter: (params) => {
            const item = sorted[params.dataIndex];
            return item ? `${item.count} (${item.percentage}%)` : '';
          },
        },
      },
    ],
  };
}

interface QuestionBreakdownChartProps {
  question: QuestionBreakdown;
}

export function QuestionBreakdownChart({ question }: QuestionBreakdownChartProps) {
  const total = question.options.reduce((sum, o) => sum + o.count, 0);
  const sorted = total > 0 ? computeOptionPercentages(question.options).sort((a, b) => b.count - a.count) : [];

  return (
    <Card>
      <h4 className="bg-body font-semibold text-(--text-primary) mb-3">{question.label}</h4>
      {total === 0 ? (
        <p className="bg-body-sm text-(--text-muted)">No answers yet in this range.</p>
      ) : (
        <>
          <EChartContainer option={buildBarOption(sorted)} height={CHART_HEIGHT} ariaLabel={`${question.label} answer breakdown`} />
          <table className="sr-only">
            <caption>{question.label} — answer breakdown</caption>
            <thead>
              <tr>
                <th>Option</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o) => (
                <tr key={o.option}>
                  <td>{o.option}</td>
                  <td>{o.count}</td>
                  <td>{o.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}
