import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/dashboard-grid/ChartWidget', () => ({
  ChartWidget: ({ chart, title }: { chart: string; title?: string }) => <div data-testid="chart">{chart}:{title ?? 'none'}</div>,
}));
vi.mock('@/components/dashboard-grid/MapWidget', () => ({
  MapWidget: ({ title }: { title?: string }) => <div data-testid="map">{title ?? 'map'}</div>,
}));
vi.mock('@/components/ui/KpiCard', () => ({
  KpiCard: ({ variant, data }: { variant: number; data: { label: string; tone?: string } }) => (
    <div data-testid="kpi">{variant}|{data.label}|{data.tone ?? 'notone'}</div>
  ),
}));

import { DashboardGrid } from '@/components/dashboard-grid/DashboardGrid';
import type { MetricMap, Widget } from '@/components/dashboard-grid/types';

const metrics: MetricMap = {
  forms: { label: 'Forms', value: 3 },
  trend: { label: 'Trend', series: [1, 2] },
  where: { label: 'Where', points: [], located: 0, total: 0 },
};
const widgets: Widget[] = [
  { id: 'a', w: 3, config: { type: 'kpi', variant: 1, metric: 'forms' } },
  { id: 'b', w: 6, config: { type: 'chart', chart: 'bar', metric: 'trend' } },
  { id: 'c', w: 12, config: { type: 'map', metric: 'where' } },
];

describe('DashboardGrid view mode', () => {
  it('renders the empty node when there are no widgets', () => {
    render(<DashboardGrid widgets={[]} metrics={metrics} empty={<p>Nothing here</p>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders nothing when empty and no empty node is given', () => {
    const { container } = render(<DashboardGrid widgets={[]} metrics={metrics} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders each widget type with no edit controls', () => {
    render(<DashboardGrid widgets={widgets} metrics={metrics} />);
    expect(screen.getByTestId('kpi')).toHaveTextContent('1|Forms|notone');
    expect(screen.getByTestId('chart')).toHaveTextContent('bar:none');
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit widget' })).not.toBeInTheDocument();
  });

  it('applies title and tone overrides to a KPI', () => {
    render(<DashboardGrid widgets={[{ id: 'a', w: 3, config: { type: 'kpi', variant: 2, metric: 'forms', title: 'Mine', tone: 'error' } }]} metrics={metrics} />);
    expect(screen.getByTestId('kpi')).toHaveTextContent('2|Mine|error');
  });

  it('says the data is unavailable when the metric is missing or the wrong shape', () => {
    const bad: Widget[] = [
      { id: 'a', w: 3, config: { type: 'kpi', variant: 1, metric: 'missing' } },
      { id: 'b', w: 3, config: { type: 'kpi', variant: 1, metric: 'trend' } },
      { id: 'c', w: 3, config: { type: 'chart', chart: 'bar', metric: 'forms' } },
      { id: 'd', w: 3, config: { type: 'map', metric: 'forms' } },
    ];
    render(<DashboardGrid widgets={bad} metrics={metrics} />);
    expect(screen.getAllByText("This widget's data isn't available.")).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Remove widget' })).not.toBeInTheDocument();
  });
});

describe('DashboardGrid edit mode', () => {
  function setup(list: Widget[] = widgets) {
    const onChange = vi.fn();
    render(<DashboardGrid widgets={list} metrics={metrics} onChange={onChange} />);
    return onChange;
  }

  it('gives each widget an Edit widget menu and a drag label', () => {
    setup();
    expect(screen.getAllByRole('button', { name: 'Edit widget' })).toHaveLength(3);
    expect(screen.getByLabelText('Card: drag to reorder, press Space to pick up')).toBeInTheDocument();
    expect(screen.getByLabelText('Chart: drag to reorder, press Space to pick up')).toBeInTheDocument();
    expect(screen.getByLabelText('Map: drag to reorder, press Space to pick up')).toBeInTheDocument();
  });

  it('removes a widget', async () => {
    const user = userEvent.setup();
    const onChange = setup();
    await user.click(screen.getAllByRole('button', { name: 'Edit widget' })[1]);
    await user.click(screen.getByRole('menuitem', { name: /Remove widget/ }));
    expect(onChange).toHaveBeenCalledWith([widgets[0], widgets[2]]);
  });

  it('resizes a widget', async () => {
    const user = userEvent.setup();
    const onChange = setup();
    await user.click(screen.getAllByRole('button', { name: 'Edit widget' })[0]);
    await user.click(screen.getByRole('menuitem', { name: /Width: Full width/ }));
    const next = onChange.mock.calls[0][0] as Widget[];
    expect(next[0]).toMatchObject({ id: 'a', w: 12 });
    expect(next.slice(1)).toEqual(widgets.slice(1));
  });

  it('recolours a KPI and offers colours only on KPIs', async () => {
    const user = userEvent.setup();
    const onChange = setup();
    await user.click(screen.getAllByRole('button', { name: 'Edit widget' })[1]);
    expect(screen.queryByRole('menuitem', { name: /Colour:/ })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getAllByRole('button', { name: 'Edit widget' })[0]);
    await user.click(screen.getByRole('menuitem', { name: /Colour: Green/ }));
    const next = onChange.mock.calls[0][0] as Widget[];
    expect(next[0].config).toMatchObject({ type: 'kpi', tone: 'success' });
  });

  it('selecting a widget does not call onChange', async () => {
    const user = userEvent.setup();
    const onChange = setup();
    await user.click(screen.getByLabelText('Card: drag to reorder, press Space to pick up'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers Remove widget inside an unavailable widget in edit mode', async () => {
    const user = userEvent.setup();
    const onChange = setup([{ id: 'x', w: 3, config: { type: 'kpi', variant: 1, metric: 'missing' } }]);
    const card = screen.getByLabelText('Card: drag to reorder, press Space to pick up');
    await user.click(within(card).getByRole('button', { name: 'Remove widget' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
