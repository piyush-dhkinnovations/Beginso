import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChartResult } from '@/components/analytics/builder/ChartResult';
import type { ChartDisplay, QueryResult } from '@/types/chartBuilder';

const entry = (key: string, n: number) => ({ key, label: key, value: n, n, share: n / 40, focus: { key } });
const RESULT = (kind: 'choice' | 'time'): QueryResult => ({
  level: { field: { kind: 'question', fieldId: 'f' }, label: 'Status', kind },
  fieldType: 'dropdown',
  optionCount: 4,
  measure: { type: 'count', label: 'Responses' },
  total: 40,
  answered: 40,
  blank: 0,
  blankLabel: "didn't answer",
  measureAnswered: null,
  entries: [entry('A', 20), entry('B', 10), entry('C', 6), entry('D', 4)],
  shown: 4,
  totalGroups: 4,
  warnings: [],
  computedAt: '2026-10-26T10:00:00.000Z',
});
const DISPLAY: ChartDisplay = { values: 'counts', legend: true, dataLabels: false, palette: 'theme', interactive: true };

const fills = (c: HTMLElement) => new Set([...c.querySelectorAll('svg rect[fill]')].map((r) => r.getAttribute('fill')).filter((f) => f && f.startsWith('var(--') && !f.includes('chart-muted')));

describe('ChartResult colours', () => {
  it('bars of a categorical chart are a mix of colours, one per group, not one colour for all', () => {
    for (const type of ['bar', 'hbar'] as const) {
      const { container } = render(<ChartResult result={RESULT('choice')} isLoading={false} isError={false} chartType={type} display={DISPLAY} label="Status" />);
      expect(fills(container).size).toBeGreaterThanOrEqual(4);
    }
  });

  it('a time series keeps one colour (the order of the dates is the point, not the groups)', () => {
    const { container } = render(<ChartResult result={RESULT('time')} isLoading={false} isError={false} chartType="bar" display={DISPLAY} label="By month" />);
    expect(fills(container).size).toBe(1);
  });

  it('a palette re-colours the picture only', () => {
    const { container } = render(<ChartResult result={RESULT('choice')} isLoading={false} isError={false} chartType="bar" display={{ ...DISPLAY, palette: 'sunset' }} label="Status" />);
    const holder = container.querySelector('svg')!.closest('[style]') as HTMLElement;
    expect(holder.style.getPropertyValue('--action-primary')).toBe('#EA580C');
  });
});
