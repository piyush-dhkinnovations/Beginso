/**
 * __tests__/components/charts/EChartContainer.test.tsx
 * Feature: sprint-5-analytics-reports
 * Tests: EChartContainer — init/setOption/dispose lifecycle, resize on container size change
 * Requirements: 14.3, 14.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import type { EChartsOption } from '@/lib/chartTheme';

const mockChart = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
};
const mockInit = vi.fn(() => mockChart);
const mockUse = vi.fn();

vi.mock('echarts/core', () => ({ init: mockInit, use: mockUse }));
vi.mock('echarts/charts', () => ({ LineChart: 'LineChart', PieChart: 'PieChart', BarChart: 'BarChart' }));
vi.mock('echarts/components', () => ({ TooltipComponent: 'TooltipComponent', GridComponent: 'GridComponent' }));
vi.mock('echarts/renderers', () => ({ CanvasRenderer: 'CanvasRenderer' }));

import { EChartContainer } from '@/components/charts/EChartContainer';

let resizeCallback: (() => void) | null = null;

class MockResizeObserver {
  constructor(cb: () => void) {
    resizeCallback = cb;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const lineOption: EChartsOption = { series: [{ type: 'line', data: [1, 2, 3] }] };
const barOption: EChartsOption = { series: [{ type: 'bar', data: [4, 5, 6] }] };

describe('EChartContainer', () => {
  beforeEach(() => {
    mockInit.mockClear();
    mockChart.setOption.mockClear();
    mockChart.resize.mockClear();
    mockChart.dispose.mockClear();
    mockUse.mockClear();
    resizeCallback = null;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lazily initializes the chart and sets the option on mount', async () => {
    render(<EChartContainer option={lineOption} height={200} ariaLabel="Test chart" />);

    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(mockChart.setOption).toHaveBeenCalledWith(lineOption);
    expect(mockUse).toHaveBeenCalledWith(['LineChart', 'PieChart', 'BarChart', 'TooltipComponent', 'GridComponent', 'CanvasRenderer']);
  });

  it('observes the container and calls chart.resize() when the ResizeObserver fires', async () => {
    render(<EChartContainer option={lineOption} height={200} ariaLabel="Test chart" />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(resizeCallback).not.toBeNull();

    resizeCallback?.();

    expect(mockChart.resize).toHaveBeenCalledTimes(1);
  });

  it('calls setOption again when the option prop changes, without re-initializing', async () => {
    const { rerender } = render(<EChartContainer option={lineOption} height={200} ariaLabel="Test chart" />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));

    rerender(<EChartContainer option={barOption} height={200} ariaLabel="Test chart" />);

    await waitFor(() => expect(mockChart.setOption).toHaveBeenLastCalledWith(barOption, true));
    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it('disposes the chart on unmount', async () => {
    const { unmount } = render(<EChartContainer option={lineOption} height={200} ariaLabel="Test chart" />);
    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));

    unmount();

    expect(mockChart.dispose).toHaveBeenCalledTimes(1);
  });

  it('renders an accessible region with the given aria-label and height', () => {
    const { getByRole } = render(<EChartContainer option={lineOption} height={240} ariaLabel="Trend chart" />);
    const el = getByRole('img', { name: 'Trend chart' });
    expect(el).toHaveStyle({ height: '240px' });
  });
});
