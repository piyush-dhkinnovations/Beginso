import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard, type KpiData, type KpiVariant } from '@/components/ui/KpiCard';

const full: KpiData = {
  label: 'Total responses',
  value: 81,
  icon: <svg data-testid="icon" />,
  delta: { value: '12.5%', note: 'vs last 30 days' },
  trend: [2, 4, 3, 7, 6, 11, 9, 14],
  percent: 46,
  status: { label: 'Healthy', tone: 'success' },
  sub: '6 published',
  period: 'Last 30 days',
  secondary: { label: 'Previous period', value: '1.4' },
  items: [{ label: 'Members', value: 4 }, { label: 'Active', value: 6 }],
  highlight: 'Higher than usual',
};
const VARIANTS = Array.from({ length: 20 }, (_, i) => (i + 1) as KpiVariant);

describe('KpiCard', () => {
  it.each(VARIANTS)('variant %i renders its value and a label without throwing', (variant) => {
    const { container } = render(<KpiCard variant={variant} data={full} />);
    // 5 and 6 show the ring percent instead of the raw value; 19 shows only its items strip.
    expect(container).toHaveTextContent(variant === 5 || variant === 6 ? '46%' : variant === 19 ? '4Members' : '81');
    expect(container).toHaveTextContent(variant === 19 ? 'Active' : 'Total responses');
  });

  it.each(VARIANTS.filter((v) => v !== 19))('variant %i degrades gracefully with only a label and value', (variant) => {
    const { container } = render(<KpiCard variant={variant} data={{ label: 'Forms', value: 3 }} />);
    expect(container).toHaveTextContent('3');
    expect(container.querySelector('svg[viewBox="0 0 120 48"]')).toBeNull();
  });

  it('variant 19 has nothing to show without items', () => {
    const { container } = render(<KpiCard variant={19} data={{ label: 'Forms', value: 3 }} />);
    expect(container).not.toHaveTextContent('Forms');
  });

  it('shows the delta and its note', () => {
    render(<KpiCard variant={7} data={full} />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last 30 days')).toBeInTheDocument();
  });

  it('draws a sparkline only when the trend has a real shape', () => {
    const { container, rerender } = render(<KpiCard variant={1} data={{ label: 'A', value: 1, trend: [1, 2, 3] }} />);
    expect(container.querySelector('svg[viewBox="0 0 120 48"]')).not.toBeNull();
    rerender(<KpiCard variant={1} data={{ label: 'A', value: 1, trend: [0, 0, 0] }} />);
    expect(container.querySelector('svg[viewBox="0 0 120 48"]')).toBeNull();
    rerender(<KpiCard variant={1} data={{ label: 'A', value: 1, trend: [5] }} />);
    expect(container.querySelector('svg[viewBox="0 0 120 48"]')).toBeNull();
  });

  it('explains an empty trend with the emptyHint when the value is zero', () => {
    render(<KpiCard variant={1} data={{ label: 'Responses', value: 0, trend: [0, 0], emptyHint: 'No responses yet' }} />);
    expect(screen.getByText('No responses yet')).toBeInTheDocument();
  });

  it('does not show the emptyHint when the value is non-zero', () => {
    render(<KpiCard variant={1} data={{ label: 'Responses', value: 4, emptyHint: 'No responses yet' }} />);
    expect(screen.queryByText('No responses yet')).not.toBeInTheDocument();
  });

  it('applies a className to the wrapper', () => {
    const { container } = render(<KpiCard variant={2} data={full} className="extra" />);
    expect(container.firstElementChild).toHaveClass('extra');
  });
});
