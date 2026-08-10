'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QuestionBreakdownChart } from './QuestionBreakdownChart';
import type { Form, FormField } from '@/types/form';
import type { QuestionBreakdown } from '@/types/analytics';

const CHOICE_FIELD_TYPES = new Set<FormField['type']>(['dropdown', 'multiple_choice', 'checkbox']);

function isChoiceField(field: FormField): boolean {
  return !field.deleted && CHOICE_FIELD_TYPES.has(field.type);
}

interface QuestionBreakdownSectionProps {
  form?: Form;
  breakdown?: QuestionBreakdown[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function QuestionBreakdownSection({ form, breakdown, isLoading, isError = false, onRetry }: QuestionBreakdownSectionProps) {
  const choiceFields = (form?.fields ?? []).filter(isChoiceField);

  // No empty section header when there's nothing to show it for (Requirement 6.5).
  if (choiceFields.length === 0) return null;

  return (
    <section aria-labelledby="question-breakdown-heading" className="flex flex-col gap-4">
      <h3 id="question-breakdown-heading" className="text-heading-2 text-neutral-900 font-bold">
        Per-Question Breakdown
      </h3>

      {isError ? (
        <Card role="alert" className="flex min-h-28 items-center justify-between gap-4">
          <div>
            <p className="text-body-sm font-semibold text-neutral-900">Unable to load question breakdowns</p>
            <p className="mt-1 text-caption text-neutral-500">The rest of the dashboard is still available.</p>
          </div>
          {onRetry && <Button variant="secondary" size="small" onClick={onRetry}>Try again</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {choiceFields.map((field) =>
            isLoading ? (
              <Card key={field.fieldId}>
                <div className="animate-pulse space-y-3" aria-busy="true" aria-label={`Loading ${field.label} breakdown`}>
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  <div className="h-24 bg-neutral-100 rounded" />
                </div>
              </Card>
            ) : (
              <QuestionBreakdownChart
                key={field.fieldId}
                question={
                  breakdown?.find((b) => b.fieldId === field.fieldId) ??
                  { fieldId: field.fieldId, label: field.label, options: [] }
                }
              />
            )
          )}
        </div>
      )}
    </section>
  );
}
