/**
 * __tests__/components/analytics/TrendChart.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: TrendChart — chart wiring, empty state (both copy variants), loading,
 * error, sr-only table content
 * Requirements: 4.1-4.6, 13.1
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TrendChart, mapTrendSeries } from '@/components/analytics/TrendChart';
import { mockAnalyticsTrends } from '@/lib/mocks/analyticsMocks';

describe('mapTrendSeries', () => {
  it('preserves length and order and never emits NaN/negative values', () => {
    const points = [
      { bucketStart: '2026-08-01T00:00:00.000Z', responses: 3 },
      { bucketStart: '2026-08-02T00:00:00.000Z', responses: 0 },
    ];
    expect(mapTrendSeries(points)).toEqual(points);
  });

  it('coerces a non-finite or negative response count to 0 rather than propagating it', () => {
    const points = [
      { bucketStart: '2026-08-01T00:00:00.000Z', responses: -5 },
      { bucketStart: '2026-08-02T00:00:00.000Z', responses: NaN },
    ];
    expect(mapTrendSeries(points)).toEqual([
      { bucketStart: '2026-08-01T00:00:00.000Z', responses: 0 },
      { bucketStart: '2026-08-02T00:00:00.000Z', responses: 0 },
    ]);
  });
});

describe('TrendChart', () => {
  it('shows a pulsing skeleton block while loading', () => {
    const { container } = render(<TrendChart isLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders an inline error card with retry', () => {
    const onRetry = vi.fn();
    render(<TrendChart isLoading={false} isError onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows "No responses in this range" when points are empty and the range isn\'t All time', () => {
    render(<TrendChart data={{ bucket: 'day', points: [] }} isLoading={false} isAllTime={false} />);
    expect(screen.getByText('No responses in this range')).toBeInTheDocument();
  });

  it('shows "No responses yet" when points are empty and the range is All time', () => {
    render(<TrendChart data={{ bucket: 'day', points: [] }} isLoading={false} isAllTime />);
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
  });

  it('renders the chart with a series matching the trend points, and a matching sr-only table', () => {
    const data = mockAnalyticsTrends();
    render(<TrendChart data={data} isLoading={false} />);

    // The SVG line chart is role=img with the same accessible name the old canvas chart had.
    expect(screen.getByRole('group', { name: 'Response trend over time' })).toBeInTheDocument();

    const table = document.querySelector('.sr-only table') as HTMLTableElement;
    expect(table.querySelectorAll('tbody tr')).toHaveLength(data.points.length);
    expect(table.textContent).toContain(String(data.points[0].responses));
  });
});
