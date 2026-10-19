import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsesOverTimeCard } from '@/components/analytics/ResponsesOverTimeCard';

describe('ResponsesOverTimeCard', () => {
  it('shows ISO week buckets as valid dates in the chart data', () => {
    render(
      <ResponsesOverTimeCard
        points={[{ bucketStart: '2026-W41', responses: 24 }]}
        isLoading={false}
        bucket="week"
        onBucketChange={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('Wk 5 Oct 2026');
    expect(table).toHaveTextContent('24');
    expect(table).not.toHaveTextContent('Invalid Date');
  });
});
