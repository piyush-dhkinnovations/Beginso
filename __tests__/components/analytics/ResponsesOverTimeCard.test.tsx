import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsesOverTimeCard, groupByMonth } from '@/components/analytics/ResponsesOverTimeCard';

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

  it('adds daily points up by calendar month, oldest first', () => {
    expect(
      groupByMonth([
        { bucketStart: '2023-02-03', responses: 2 },
        { bucketStart: '2023-01-31', responses: 1 },
        { bucketStart: '2023-02-20', responses: 5 },
      ]),
    ).toEqual([
      { bucketStart: '2023-01-01', responses: 1 },
      { bucketStart: '2023-02-01', responses: 7 },
    ]);
  });

  it('shows one bar per month, named "Feb 2023", when grouped by month', () => {
    render(
      <ResponsesOverTimeCard
        points={[{ bucketStart: '2023-02-03', responses: 2 }, { bucketStart: '2023-02-20', responses: 5 }]}
        isLoading={false}
        bucket="month"
        onBucketChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('table')).toHaveTextContent('Feb 2023');
    expect(screen.getByRole('table')).toHaveTextContent('7');
    expect(screen.getByRole('option', { name: 'Monthly' })).toBeInTheDocument();
  });

  it('offers Daily only while the chart is short enough to read by the day', () => {
    const weeks = Array.from({ length: 40 }, (_, i) => ({ bucketStart: `2025-W${String(i + 1).padStart(2, '0')}`, responses: 1 }));
    const { rerender } = render(<ResponsesOverTimeCard points={weeks} isLoading={false} bucket="week" onBucketChange={vi.fn()} />);
    expect(screen.queryByRole('option', { name: 'Daily' })).not.toBeInTheDocument();
    rerender(<ResponsesOverTimeCard points={weeks.slice(0, 5)} isLoading={false} bucket="week" onBucketChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'Daily' })).toBeInTheDocument();
  });

  it('a day is just its date, in full for the tooltip', () => {
    render(<ResponsesOverTimeCard points={[{ bucketStart: '2026-10-05', responses: 4 }]} isLoading={false} bucket="day" onBucketChange={vi.fn()} />);
    expect(screen.getByRole('table')).toHaveTextContent('5 Oct 2026');
    expect(screen.getByRole('table')).not.toHaveTextContent('Week of');
  });
});
