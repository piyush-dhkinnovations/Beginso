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
    expect(table).toHaveTextContent('Week of 5 Oct 2026');
    expect(table).not.toHaveTextContent('Wk');
    expect(table).toHaveTextContent('24');
    expect(table).not.toHaveTextContent('Invalid Date');
  });

  const axisLabels = (c: HTMLElement) => [...c.querySelectorAll('svg text')].map((t) => t.textContent);

  it('names a bar in full for the tooltip and screen readers, and briefly on the axis: "24 Aug" within a year', () => {
    const { container } = render(
      <ResponsesOverTimeCard
        points={[{ bucketStart: '2026-W35', responses: 3 }, { bucketStart: '2026-W36', responses: 5 }]}
        isLoading={false}
        bucket="week"
        onBucketChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('table')).toHaveTextContent('Week of 24 Aug 2026');
    expect(screen.getByRole('table')).toHaveTextContent('Week of 31 Aug 2026');
    expect(axisLabels(container)).toEqual(expect.arrayContaining(['24 Aug', '31 Aug']));
    expect(axisLabels(container).join(' ')).not.toMatch(/Wk/);
  });

  it('puts the year on the axis once the chart reaches across years, as "Aug 2020", short enough never to be cut off', () => {
    const { container } = render(
      <ResponsesOverTimeCard
        points={[{ bucketStart: '2020-W35', responses: 1 }, { bucketStart: '2021-W06', responses: 2 }]}
        isLoading={false}
        bucket="week"
        onBucketChange={vi.fn()}
      />,
    );
    expect(axisLabels(container)).toEqual(expect.arrayContaining(['Aug 2020', 'Feb 2021']));
    expect(screen.getByRole('table')).toHaveTextContent('Week of 24 Aug 2020');
    expect('Aug 2020'.length).toBeLessThanOrEqual(8);
  });

  it('a day is just its date, in full for the tooltip', () => {
    render(<ResponsesOverTimeCard points={[{ bucketStart: '2026-10-05', responses: 4 }]} isLoading={false} bucket="day" onBucketChange={vi.fn()} />);
    expect(screen.getByRole('table')).toHaveTextContent('5 Oct 2026');
    expect(screen.getByRole('table')).not.toHaveTextContent('Week of');
  });
});
