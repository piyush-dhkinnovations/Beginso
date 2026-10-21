'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuestionBreakdownChart } from './QuestionBreakdownChart';
import { QuestionSummaryCard, hasSummary } from './QuestionSummaryCard';
import type { Form, FormField } from '@/types/form';
import type { QuestionBreakdown } from '@/types/analytics';

const CHOICE_FIELD_TYPES = new Set<FormField['type']>(['dropdown', 'multiple_choice', 'checkbox']);

function isChoiceField(field: FormField): boolean {
  return !field.deleted && CHOICE_FIELD_TYPES.has(field.type);
}

// Questions with no options to count: they get an average / split instead (QA A7-008).
const SUMMARY_FIELD_TYPES = new Set<FormField['type']>(['rating', 'number', 'currency', 'yes_no']);

function isSummaryField(field: FormField): boolean {
  return !field.deleted && SUMMARY_FIELD_TYPES.has(field.type);
}

interface QuestionBreakdownSectionProps {
  form?: Form;
  breakdown?: QuestionBreakdown[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** fieldIds that already have a saved chart in the Charts section. */
  chartedFieldIds?: ReadonlySet<string>;
}

export function QuestionBreakdownSection({ form, breakdown, isLoading, isError = false, onRetry, chartedFieldIds }: QuestionBreakdownSectionProps) {
  const choiceFields = (form?.fields ?? []).filter(isChoiceField);
  const summaryFields = (form?.fields ?? []).filter(isSummaryField);

  // The form's own field label wins over whatever label the analytics payload carries (it can be the bare type name,
  // e.g. two cards both titled "Multiple Choice"); if two questions still share a label, number them.
  const labelOf = (field: FormField, i: number) => {
    const base = field.label?.trim() || 'Untitled question';
    return choiceFields.filter((f) => (f.label?.trim() || 'Untitled question') === base).length > 1 ? `${base} (question ${i + 1})` : base;
  };

  // No empty section header when there's nothing to show it for (Requirement 6.5).
  if (choiceFields.length === 0 && summaryFields.length === 0) return null;

  // Questions the user already charted below are not repeated here; unanswered ones collapse into one list.
  const rows = choiceFields.map((field, i) => ({
    field,
    i,
    question: {
      ...(breakdown?.find((b) => b.fieldId === field.fieldId) ?? { fieldId: field.fieldId, options: [] }),
      label: labelOf(field, i),
    },
  }));
  const charted = rows.filter((r) => chartedFieldIds?.has(r.field.fieldId));
  const rest = rows.filter((r) => !chartedFieldIds?.has(r.field.fieldId));
  const isEmpty = (r: (typeof rows)[number]) => r.question.options.every((o) => o.count === 0);
  const summaryRows = summaryFields
    .filter((field) => !chartedFieldIds?.has(field.fieldId))
    .map((field) => ({
      field,
      question: { ...(breakdown?.find((b) => b.fieldId === field.fieldId) ?? { fieldId: field.fieldId, options: [] }), label: field.label?.trim() || 'Untitled question' },
    }));
  const summaryShown = isLoading ? [] : summaryRows.filter((r) => hasSummary(r.question));
  const empty = isLoading ? [] : [...rest.filter(isEmpty), ...summaryRows.filter((r) => !hasSummary(r.question))];
  const shown = isLoading ? rest : rest.filter((r) => !isEmpty(r));

  return (
    <section aria-labelledby="question-breakdown-heading" className="flex flex-col gap-4">
      <h3 id="question-breakdown-heading" className="bg-h5 text-(--text-primary) font-bold">
        Per-Question Breakdown
      </h3>

      {isError ? (
        <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
          <div>
            <p className="bg-body-sm font-semibold text-(--text-primary)">Unable to load question breakdowns</p>
            <p className="mt-1 bg-caption text-(--text-muted)">The rest of the dashboard is still available.</p>
          </div>
          {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
        </Card>
      ) : (
        <>
          {charted.length > 0 && (
            <p className="bg-caption text-(--text-muted)">
              Shown as a chart below: {charted.map(({ field, i }) => labelOf(field, i)).join(', ')}
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...shown, ...(isLoading ? summaryRows : [])].map(({ field, question }) =>
              isLoading ? (
                <Card key={field.fieldId}>
                  <div className="animate-pulse space-y-3" aria-busy="true" aria-label={`Loading ${field.label} breakdown`}>
                    <div className="h-4 bg-(--border-default) rounded w-1/2" />
                    <div className="h-24 bg-(--bg-sunken) rounded" />
                  </div>
                </Card>
              ) : (
                <QuestionBreakdownChart key={field.fieldId} question={question} />
              )
            )}
            {summaryShown.map(({ field, question }) => (
              <QuestionSummaryCard key={field.fieldId} question={question} />
            ))}
          </div>
          {empty.length > 0 && (
            <Card>
              <details>
                <summary className="cursor-pointer bg-body-sm font-semibold text-(--text-primary)">
                  {empty.length === 1 ? '1 question has' : `${empty.length} questions have`} no answers in this range
                </summary>
                <ul className="mt-3 list-disc pl-5 bg-body-sm text-(--text-muted)">
                  {empty.map(({ field, question }) => (
                    <li key={field.fieldId}>{question.label}</li>
                  ))}
                </ul>
              </details>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
