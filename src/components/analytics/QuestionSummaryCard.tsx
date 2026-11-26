'use client';

import { Card } from '@/components/ui/Card';
import { BarsChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import { QuestionCardHeader, barStyle, type QuestionCardControls } from './QuestionBreakdownChart';
import type { QuestionBreakdown } from '@/types/analytics';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

/** True when the payload carries a rating, number or yes/no summary for this question. */
export const hasSummary = (q: QuestionBreakdown | undefined): boolean => !!(q && (q.rating || q.numeric || q.yesNo));

interface QuestionSummaryCardProps extends QuestionCardControls {
  question: QuestionBreakdown;
}

// Rating, number and yes/no questions have no options to count, so the choice chart does not fit: ratings get an average and the
// spread, numbers get average / lowest / highest / total, yes/no gets the split (QA A7-008).
export function QuestionSummaryCard({ question, handle, actions, color }: QuestionSummaryCardProps) {
  const { rating, numeric, yesNo } = question;

  return (
    <Card className="@container h-full">
      <QuestionCardHeader label={question.label} handle={handle} actions={actions} />

      {rating && (
        <>
          <p className="bg-h3 font-bold text-(--text-primary)">
            {fmt(rating.average)} <span className="bg-body-sm font-normal text-(--text-muted)">out of {rating.max}</span>
          </p>
          <p className="mb-2 bg-body-sm text-(--text-muted)">
            {rating.count} {rating.count === 1 ? 'person' : 'people'} rated
          </p>
          <div style={barStyle(color)}>
            <BarsChart
              horizontal
              data={toSegments(rating.distribution.map((d) => ({ label: `${d.value}`, value: d.count }))).map((seg, i) => ({ ...seg, percentage: rating.distribution[i].percentage }))}
              ariaLabel={`${question.label} — how many gave each rating`}
            />
          </div>
        </>
      )}

      {numeric && (
        <>
          <dl className="grid grid-cols-2 gap-3 @md:grid-cols-4">
            {[
              ['Average', numeric.average],
              ['Lowest', numeric.min],
              ['Highest', numeric.max],
              ['Total', numeric.sum],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="bg-caption text-(--text-muted)">{label}</dt>
                <dd className="bg-h5 font-bold text-(--text-primary)">{fmt(value as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 bg-body-sm text-(--text-muted)">
            from {numeric.count} {numeric.count === 1 ? 'answer' : 'answers'}
          </p>
        </>
      )}

      {yesNo && (
        <>
          <p className="bg-h3 font-bold text-(--text-primary)">
            {fmt(yesNo.percentageYes)}% <span className="bg-body-sm font-normal text-(--text-muted)">said yes</span>
          </p>
          <p className="mb-2 bg-body-sm text-(--text-muted)">
            {yesNo.yes} yes · {yesNo.no} no
          </p>
          <div style={barStyle(color)}>
            <BarsChart
              horizontal
              data={toSegments([
                { label: 'Yes', value: yesNo.yes },
                { label: 'No', value: yesNo.no },
              ])}
              ariaLabel={`${question.label} — yes and no answers`}
            />
          </div>
        </>
      )}
    </Card>
  );
}
