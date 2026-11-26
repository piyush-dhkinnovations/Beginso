'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { BarsChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import type { QuestionBreakdown, QuestionOption } from '@/types/analytics';

export interface QuestionOptionWithPercentage extends QuestionOption {
  percentage: number;
}

/**
 * Each option's share of the PEOPLE WHO ANSWERED, not of the ticks. For a single-choice question the two are the same;
 * for a multi-select question they are not, and the shares can add up to more than 100 (50% / 50% / 50% is correct when
 * two people each ticked all three). The API's own percentage wins; otherwise count / totalAnswered, falling back to
 * the sum of counts only when totalAnswered is unknown (single-choice).
 */
export function computeOptionPercentages(options: QuestionOption[], totalAnswered?: number): QuestionOptionWithPercentage[] {
  const denominator = totalAnswered && totalAnswered > 0 ? totalAnswered : options.reduce((sum, o) => sum + o.count, 0);
  return options.map((o) => ({
    ...o,
    percentage:
      typeof o.percentage === 'number' && Number.isFinite(o.percentage)
        ? Math.round(o.percentage)
        : denominator > 0
          ? Math.round((o.count / denominator) * 100)
          : 0,
  }));
}

/** The drag handle, options menu and bar colour a card is given by the breakdown grid. */
export interface QuestionCardControls {
  handle?: ReactNode;
  actions?: ReactNode;
  color?: string;
}

/** Re-points the colour the bar charts draw with, around the picture only. No colour = the theme's own. */
export const barStyle = (color?: string) => (color ? ({ '--action-primary': color } as CSSProperties) : undefined);

export function QuestionCardHeader({ label, handle, actions }: QuestionCardControls & { label: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {handle}
      <h4 className="min-w-0 flex-1 bg-body font-semibold text-(--text-primary)">{label}</h4>
      {actions}
    </div>
  );
}

interface QuestionBreakdownChartProps extends QuestionCardControls {
  question: QuestionBreakdown;
}

export function QuestionBreakdownChart({ question, handle, actions, color }: QuestionBreakdownChartProps) {
  const ticks = question.options.reduce((sum, o) => sum + o.count, 0);
  const answered = question.totalAnswered ?? ticks;
  const total = Math.max(ticks, answered);
  const sorted = total > 0 ? computeOptionPercentages(question.options, question.totalAnswered).sort((a, b) => b.count - a.count) : [];
  const multi = ticks > answered;

  return (
    <Card className="h-full">
      <QuestionCardHeader label={question.label} handle={handle} actions={actions} />
      {total === 0 ? (
        <p className="bg-body-sm text-(--text-muted)">No answers yet in this range.</p>
      ) : (
        <>
          <p className="mb-2 bg-body-sm text-(--text-muted)">
            {answered} {answered === 1 ? 'person' : 'people'} answered
            {multi ? ' · each option is a share of those people, so the total can exceed 100%' : ''}
          </p>
          <div style={barStyle(color)}>
            <BarsChart horizontal data={toSegments(sorted.map((o) => ({ label: o.option, value: o.count }))).map((seg, i) => ({ ...seg, percentage: sorted[i].percentage }))} ariaLabel={`${question.label} — answer breakdown`} />
          </div>
          <div className="sr-only"><table>
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
          </table></div>
        </>
      )}
    </Card>
  );
}
