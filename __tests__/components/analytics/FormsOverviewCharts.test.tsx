import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/charts', async (orig) => ({
  ...(await orig<typeof import('@/components/ui/charts')>()),
  BarsChart: ({ data }: { data: { label: string; count: number }[] }) => (
    <ol data-testid="bars">{data.map((d) => <li key={d.label}>{d.label}:{d.count}</li>)}</ol>
  ),
}));

import { FormsOverviewCharts, type FormsOverviewChartsItem } from '@/components/analytics/FormsOverviewCharts';

const f = (title: string, responses: number): FormsOverviewChartsItem => ({ title, status: 'published', responses });

describe('FormsOverviewCharts', () => {
  it('renders nothing for an empty list', () => {
    const { container } = render(<FormsOverviewCharts forms={[]} insightsHref="/insights" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('ranks the busiest forms, dropping those with no responses', () => {
    render(<FormsOverviewCharts forms={[f('A', 2), f('B', 9), f('C', 0), f('D', 5)]} insightsHref="/insights" />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['B:9', 'D:5', 'A:2']);
  });

  it('keeps only the top five', () => {
    const forms = Array.from({ length: 8 }, (_, i) => f(`F${i}`, i + 1));
    render(<FormsOverviewCharts forms={forms} insightsHref="/insights" />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['F7:8', 'F6:7', 'F5:6', 'F4:5', 'F3:4']);
  });

  it('shows a hint when no form has responses yet', () => {
    render(<FormsOverviewCharts forms={[f('A', 0)]} insightsHref="/insights" />);
    expect(screen.queryByTestId('bars')).not.toBeInTheDocument();
    expect(screen.getByText(/No responses yet/)).toBeInTheDocument();
  });

  it('links to Insights', () => {
    render(<FormsOverviewCharts forms={[f('A', 1)]} insightsHref="/w/acme/insights" />);
    expect(screen.getByRole('link', { name: 'See forms by status in Insights' })).toHaveAttribute('href', '/w/acme/insights');
  });
});
