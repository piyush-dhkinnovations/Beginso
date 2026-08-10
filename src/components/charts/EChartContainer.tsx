'use client';

import { useEffect, useRef } from 'react';
import type { ECharts } from 'echarts/core';
import type { EChartsOption } from '@/lib/chartTheme';

interface EChartContainerProps {
  option: EChartsOption;
  height: number;
  ariaLabel: string;
}

// Tree-shaken: only the chart types and components this sprint's charts actually use, never the
// full `echarts` bundle. Loaded once and cached — every EChartContainer instance shares the
// same registration.
let echartsCorePromise: Promise<typeof import('echarts/core')> | null = null;

function loadECharts() {
  if (!echartsCorePromise) {
    echartsCorePromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, components, renderers]) => {
      core.use([
        charts.LineChart,
        charts.PieChart,
        charts.BarChart,
        components.TooltipComponent,
        components.GridComponent,
        renderers.CanvasRenderer,
      ]);
      return core;
    });
  }
  return echartsCorePromise;
}

/**
 * The one component that calls the `echarts` API directly — every chart in the analytics/reports
 * sprint renders through this. Owns init/setOption/resize/dispose lifecycle.
 */
export function EChartContainer({ option, height, ariaLabel }: EChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const optionRef = useRef(option);

  // Keeps optionRef in sync (for the mount effect's async init below) and pushes updates into an
  // already-initialized chart. Ref writes happen here, in an effect, never during render.
  useEffect(() => {
    optionRef.current = option;
    chartRef.current?.setOption(option, true);
  }, [option]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    loadECharts().then((core) => {
      if (disposed || !containerRef.current) return;
      const chart = core.init(containerRef.current);
      chart.setOption(optionRef.current);
      chartRef.current = chart;

      resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(containerRef.current);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} role="img" aria-label={ariaLabel} style={{ height }} className="w-full" />;
}
