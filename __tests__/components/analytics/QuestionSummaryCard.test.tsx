import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/charts/EChartContainer', () => ({
  EChartContainer: ({ option, ariaLabel }: { option: unknown; ariaLabel: string }) => (
    <div role="img" aria-label={ariaLabel} data-option={JSON.stringify(option)} />
  ),
}));

import { QuestionSummaryCard, hasSummary } from '@/components/analytics/QuestionSummaryCard';
import type { QuestionBreakdown } from '@/types/analytics';

const base: QuestionBreakdown = { fieldId: 'q', label: 'A question', options: [] };

describe('hasSummary', () => {
  it('is true only when the payload carries a rating, number or yes/no summary', () => {
    expect(hasSummary(undefined)).toBe(false);
    expect(hasSummary(base)).toBe(false);
    expect(hasSummary({ ...base, yesNo: { yes: 1, no: 0, percentageYes: 100 } })).toBe(true);
  });
});

describe('QuestionSummaryCard (QA A7-008)', () => {
  it('shows a rating question as an average out of the scale, who rated, and the spread', () => {
    render(
      <QuestionSummaryCard
        question={{
          ...base,
          label: 'Rate us',
          rating: {
            count: 3,
            average: 4.33,
            max: 5,
            distribution: [1, 2, 3, 4, 5].map((value) => ({ value, count: value === 4 ? 2 : value === 5 ? 1 : 0, percentage: value === 4 ? 66.67 : value === 5 ? 33.33 : 0 })),
          },
        }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Rate us' })).toBeInTheDocument();
    expect(screen.getByText('4.33')).toBeInTheDocument();
    expect(screen.getByText('out of 5')).toBeInTheDocument();
    expect(screen.getByText('3 people rated')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Rate us — how many gave each rating' })).toBeInTheDocument();
  });

  it('shows a number question as average, lowest, highest and total', () => {
    render(<QuestionSummaryCard question={{ ...base, label: 'How many', numeric: { count: 3, average: 20, min: 10, max: 30, sum: 60 } }} />);
    expect(screen.getByText('Average').nextElementSibling).toHaveTextContent('20');
    expect(screen.getByText('Lowest').nextElementSibling).toHaveTextContent('10');
    expect(screen.getByText('Highest').nextElementSibling).toHaveTextContent('30');
    expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('60');
    expect(screen.getByText('from 3 answers')).toBeInTheDocument();
  });

  it('shows a yes/no question as the share of yes with the split', () => {
    render(<QuestionSummaryCard question={{ ...base, label: 'Recommend', yesNo: { yes: 2, no: 1, percentageYes: 66.67 } }} />);
    expect(screen.getByText('66.67%')).toBeInTheDocument();
    expect(screen.getByText('said yes')).toBeInTheDocument();
    expect(screen.getByText('2 yes · 1 no')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Recommend — yes and no answers' })).toBeInTheDocument();
  });
});
