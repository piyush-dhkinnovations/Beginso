/**
 * __tests__/components/analytics/DateRangeFilter.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: DateRangeFilter — preset selection updates URL params, custom-range swap-on-invert,
 * aria-pressed state, controlled mode
 * Requirements: 3.1-3.6, 13.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let search = '';
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/analytics',
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}));

import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';

const PRESET_LABELS = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'];

describe('DateRangeFilter — uncontrolled (URL-owning) mode', () => {
  beforeEach(() => {
    search = '';
    mockReplace.mockReset();
  });

  it('renders the presets in a role="group" labeled "Date range"', () => {
    render(<DateRangeFilter />);
    expect(screen.getByRole('group', { name: 'Date range' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument();
  });

  it('defaults to "Last 30 days" (aria-pressed) when the URL has no from/to (Requirement 3.2)', () => {
    render(<DateRangeFilter />);
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking "Last 7 days" writes UTC day-boundary from/to params via router.replace', () => {
    render(<DateRangeFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    expect(mockReplace).toHaveBeenCalledTimes(1);
    const params = new URLSearchParams((mockReplace.mock.calls[0][0] as string).split('?')[1]);
    const from = new Date(params.get('from') as string);
    const to = new Date(params.get('to') as string);
    expect([from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds()]).toEqual([0, 0, 0, 0]);
    expect([to.getHours(), to.getMinutes(), to.getSeconds(), to.getMilliseconds()]).toEqual([23, 59, 59, 999]);
  });

  it('clicking "All time" writes the from=all&to=all sentinel (round-trips through the URL)', () => {
    search = 'from=2026-08-01T00:00:00.000Z&to=2026-08-10T23:59:59.999Z';
    render(<DateRangeFilter />);
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));

    const params = new URLSearchParams((mockReplace.mock.calls[0][0] as string).split('?')[1]);
    expect(params.get('from')).toBe('all');
    expect(params.get('to')).toBe('all');
  });

  it('shows "All time" as active when the URL carries the sentinel', () => {
    search = 'from=all&to=all';
    render(<DateRangeFilter />);
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('indicates "Custom" when the range matches no preset', () => {
    search = 'from=2026-08-03T00:00:00.000Z&to=2026-08-05T23:59:59.999Z';
    render(<DateRangeFilter />);
    PRESET_LABELS.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false');
    });
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('rejects an inverted custom range inline and does not touch the URL (A7-003)', () => {
    search = 'from=2026-08-01T00:00:00.000Z&to=2026-08-01T23:59:59.999Z';
    render(<DateRangeFilter />);

    fireEvent.change(screen.getByLabelText('Custom range start date'), { target: { value: '2026-08-15' } });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/end date must be on or after the start date/i);
    expect(screen.getByLabelText('Custom range start date')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('DateRangeFilter — controlled mode', () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it('calls onChange instead of touching the router when value/onChange are provided', () => {
    const onChange = vi.fn();
    render(<DateRangeFilter value={{ from: undefined, to: undefined }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('treats an undefined value as "All time" active — no implicit 30-day default in controlled mode', () => {
    render(<DateRangeFilter value={{ from: undefined, to: undefined }} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
  });
});
