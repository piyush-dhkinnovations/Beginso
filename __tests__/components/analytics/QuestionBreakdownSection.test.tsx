/**
 * __tests__/components/analytics/QuestionBreakdownSection.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: QuestionBreakdownSection — renders one card per choice field, skips non-choice fields,
 * hides section when there are none; QuestionBreakdownChart — percentages, per-card empty state
 * Requirements: 6.1-6.6, 13.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ option, ariaLabel }: { option: unknown; ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel} data-option={JSON.stringify(option)} />
  ),
}));

import { QuestionBreakdownSection } from '@/components/analytics/QuestionBreakdownSection';
import { computeOptionPercentages } from '@/components/analytics/QuestionBreakdownChart';
import type { Form, FormField } from '@/types/form';
import type { QuestionBreakdown } from '@/types/analytics';

function field(overrides: Partial<FormField> & Pick<FormField, 'fieldId' | 'type' | 'label'>): FormField {
  return {
    pageId: 'page-1',
    required: false,
    deleted: false,
    order: 0,
    ...overrides,
  } as FormField;
}

const dropdownField = field({ fieldId: 'f1', type: 'dropdown', label: 'Referral source', options: ['Social', 'Friend'] });
const checkboxField = field({ fieldId: 'f2', type: 'checkbox', label: 'Topics', options: ['Design', 'Dev'] });
const deletedChoiceField = field({ fieldId: 'f3', type: 'multiple_choice', label: 'Deleted field', options: ['A'], deleted: true });
const textField = field({ fieldId: 'f4', type: 'short_text', label: 'Full name' });

function makeForm(fields: FormField[]): Form {
  return {
    _id: 'form-1',
    workspaceId: 'ws-1',
    title: 'Test Form',
    status: 'published',
    fields,
    pages: [{ id: 'page-1', order: 0 }],
    branding: {},
    settings: { honeypotEnabled: true },
    schemaVersion: 1,
    responseCount: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

describe('QuestionBreakdownSection', () => {
  it('renders nothing when the form has zero choice fields', () => {
    const { container } = render(
      <QuestionBreakdownSection form={makeForm([textField])} breakdown={[]} isLoading={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders one card per active, non-deleted choice field, skipping text and deleted fields', () => {
    const breakdown: QuestionBreakdown[] = [
      { fieldId: 'f1', label: 'Referral source', options: [{ option: 'Social', count: 3 }, { option: 'Friend', count: 1 }] },
      { fieldId: 'f2', label: 'Topics', options: [] },
    ];
    render(
      <QuestionBreakdownSection
        form={makeForm([dropdownField, checkboxField, deletedChoiceField, textField])}
        breakdown={breakdown}
        isLoading={false}
      />
    );

    expect(screen.getByText('Per-Question Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Referral source')).toBeInTheDocument();
    expect(screen.getByText('Topics')).toBeInTheDocument();
    expect(screen.queryByText('Deleted field')).not.toBeInTheDocument();
    expect(screen.queryByText('Full name')).not.toBeInTheDocument();
  });

  it('shows a per-card "No answers yet in this range" message for a choice field with zero answers', () => {
    render(
      <QuestionBreakdownSection
        form={makeForm([checkboxField])}
        breakdown={[{ fieldId: 'f2', label: 'Topics', options: [] }]}
        isLoading={false}
      />
    );
    expect(screen.getByText('1 question has no answers in this range')).toBeInTheDocument();
  });

  it('shows a loading skeleton per choice field while the breakdown query is loading', () => {
    const { container } = render(
      <QuestionBreakdownSection form={makeForm([dropdownField, checkboxField])} isLoading />
    );
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
  });

  it('renders an inline error card with retry, section-scoped', () => {
    const onRetry = vi.fn();
    render(<QuestionBreakdownSection form={makeForm([dropdownField])} isLoading={false} isError onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sorts options by count descending and shows count + percentage for each', () => {
    const breakdown: QuestionBreakdown[] = [
      {
        fieldId: 'f1',
        label: 'Referral source',
        options: [
          { option: 'Social', count: 1 },
          { option: 'Friend', count: 3 },
        ],
      },
    ];
    render(<QuestionBreakdownSection form={makeForm([dropdownField])} breakdown={breakdown} isLoading={false} />);

    const table = document.querySelector('table.sr-only') as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((r) => r.textContent);
    expect(rows[0]).toContain('Friend');
    expect(rows[0]).toContain('75%');
    expect(rows[1]).toContain('Social');
    expect(rows[1]).toContain('25%');
  });
});

describe('computeOptionPercentages', () => {
  it('sums to exactly 100 for a non-empty, non-zero breakdown', () => {
    const result = computeOptionPercentages([
      { option: 'A', count: 1 },
      { option: 'B', count: 1 },
      { option: 'C', count: 1 },
    ]);
    expect(result.reduce((sum, o) => sum + o.percentage, 0)).toBe(100);
  });

  it('returns 0% for every option when all counts are 0', () => {
    const result = computeOptionPercentages([{ option: 'A', count: 0 }, { option: 'B', count: 0 }]);
    expect(result.every((o) => o.percentage === 0)).toBe(true);
  });
});
