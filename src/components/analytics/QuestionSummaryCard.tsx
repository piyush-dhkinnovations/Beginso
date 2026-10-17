'use client';

import { Card } from '@/components/ui/Card';
import { BarsChart } from '@/components/ui/charts';
import { toSegments } from '@/lib/chartSegments';
import type { QuestionBreakdown } from '@/types/analytics';

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

/** True when the payload carries a rating, number or yes/no summary for this question. */
export const hasSummary = (q: QuestionBreakdown | undefined): boolean => !!(q && (q.rating || q.numeric || q.yesNo));

interface QuestionSummaryCardProps {
  question: QuestionBreakdown;
}

// Rating, number and yes/no questions have no options to count, so the choice chart does not fit: ratings get an average and the
// spread, numbers get average / lowest / highest / total, yes/no gets the split (QA A7-008).
export function QuestionSummaryCard({ question }: QuestionSummaryCardProps) {
  const { rating, numeric, yesNo } = question;

  return (
    <Card>
      <h4 className="bg-body font-semibold text-(--text-primary) mb-3">{question.label}</h4>

      {rating && (
        <>
          <p className="bg-h3 font-bold text-(--text-primary)">
            {fmt(rating.average)} <span className="bg-body-sm font-normal text-(--text-muted)">out of {rating.max}</span>
          </p>
          <p className="mb-2 bg-body-sm text-(--text-muted)">
            {rating.count} {rating.count === 1 ? 'person' : 'people'} rated
          </p>
          <BarsChart
            horizontal
            data={toSegments(rating.distribution.map((d) => ({ label: `${d.value}`, value: d.count }))).map((seg, i) => ({ ...seg, percentage: rating.distribution[i].percentage }))}
            ariaLabel={`${question.label} — how many gave each rating`}
          />
        </>
      )}

      {numeric && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <BarsChart
            horizontal
            data={toSegments([
              { label: 'Yes', value: yesNo.yes },
              { label: 'No', value: yesNo.no },
            ]).map((seg) => seg)}
            ariaLabel={`${question.label} — yes and no answers`}
          />
        </>
      )}
    </Card>
  );
}
