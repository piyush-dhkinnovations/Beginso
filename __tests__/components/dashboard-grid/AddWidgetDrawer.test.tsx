import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/dashboard-grid/ChartWidget', () => ({
  CHART_LABEL: { bar: 'Bar chart', line: 'Line chart', area: 'Area chart', hbar: 'Horizontal bars', donut: 'Donut', pie: 'Pie', status: 'Status bar' },
  ChartWidget: ({ chart }: { chart: string }) => <div data-testid={`chart-${chart}`} />,
}));
vi.mock('@/components/dashboard-grid/MapWidget', () => ({
  MapWidget: ({ preview }: { preview?: boolean }) => <div data-testid="map" data-preview={String(!!preview)} />,
}));
vi.mock('@/components/ui/KpiCard', () => ({
  KpiCard: ({ variant, data }: { variant: number; data: { tone?: string } }) => <div data-testid={`kpi-${variant}`} data-tone={data.tone} />,
}));

import { AddWidgetDrawer } from '@/components/dashboard-grid/AddWidgetDrawer';
import type { MetricMap } from '@/components/dashboard-grid/types';

const metrics: MetricMap = {
  plain: { label: 'Plain', value: 1 },
  rich: {
    label: 'Rich', value: 5, trend: [1, 2, 3], percent: 40, secondary: { label: 'Prev', value: 2 },
    items: [{ label: 'a', value: 1 }], highlight: 'Up',
  },
  trend: { label: 'Over time', series: [1, 2, 3] },
  status: { label: 'By status', segments: [{ label: 'A', value: 1 }] },
  where: { label: 'Where', points: [], located: 0, total: 0 },
};

function setup(over: Partial<React.ComponentProps<typeof AddWidgetDrawer>> = {}) {
  const onAdd = vi.fn();
  const onClose = vi.fn();
  render(<AddWidgetDrawer isOpen onClose={onClose} onAdd={onAdd} metrics={metrics} {...over} />);
  return { onAdd, onClose };
}

describe('AddWidgetDrawer', () => {
  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists each metric as a radio, first selected', () => {
    setup();
    const group = screen.getByRole('radiogroup', { name: 'Data' });
    const radios = group.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Plain' })).toHaveAttribute('aria-checked', 'true');
  });

  it('only offers looks the metric has data for', () => {
    setup();
    for (const v of [1, 2, 7, 11, 13, 17]) expect(screen.getByTestId(`kpi-${v}`)).toBeInTheDocument();
    for (const v of [3, 4, 8, 14, 19, 20]) expect(screen.queryByTestId(`kpi-${v}`)).not.toBeInTheDocument();
  });

  it('offers every look for a fully populated metric', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('radio', { name: 'Rich' }));
    expect(screen.getByTestId('kpi-3')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-19')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-20')).toBeInTheDocument();
  });

  it('adds a KPI with the default width, mixed tone, then closes', async () => {
    const user = userEvent.setup();
    const { onAdd, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Add Minimal' }));
    expect(onAdd).toHaveBeenCalledWith({ w: 4, config: { type: 'kpi', variant: 1, metric: 'plain', tone: 'primary' } });
    expect(onClose).toHaveBeenCalled();
  });

  it('applies a picked colour to every look', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByRole('radio', { name: 'Red' }));
    expect(screen.getByTestId('kpi-2')).toHaveAttribute('data-tone', 'error');
    await user.click(screen.getByRole('button', { name: 'Add Solid' }));
    expect(onAdd).toHaveBeenCalledWith({ w: 4, config: { type: 'kpi', variant: 2, metric: 'plain', tone: 'error' } });
  });

  it('gives wide looks a width of 6', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByRole('radio', { name: 'Rich' }));
    await user.click(screen.getByRole('button', { name: 'Add Two metrics' }));
    expect(onAdd.mock.calls[0][0]).toMatchObject({ w: 6, config: { variant: 8, metric: 'rich' } });
  });

  it('offers time-series chart styles for a series metric', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByRole('radio', { name: 'Over time' }));
    expect(screen.queryByRole('radiogroup', { name: 'Colour' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Add / }).map((b) => b.getAttribute('aria-label'))).toEqual(['Add Bar chart', 'Add Line chart', 'Add Area chart']);
    await user.click(screen.getByRole('button', { name: 'Add Line chart' }));
    expect(onAdd).toHaveBeenCalledWith({ w: 6, config: { type: 'chart', chart: 'line', metric: 'trend' } });
  });

  it('uses width 4 for donut, pie and status charts', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByRole('radio', { name: 'By status' }));
    await user.click(screen.getByRole('button', { name: 'Add Donut' }));
    expect(onAdd).toHaveBeenCalledWith({ w: 4, config: { type: 'chart', chart: 'donut', metric: 'status' } });
  });

  it('offers a single full-width map for a location metric', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();
    await user.click(screen.getByRole('radio', { name: 'Where' }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-preview', 'true');
    await user.click(screen.getByRole('button', { name: 'Add Response map' }));
    expect(onAdd).toHaveBeenCalledWith({ w: 12, config: { type: 'map', metric: 'where' } });
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
