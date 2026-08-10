import type { ComposeOption } from 'echarts/core';
import type { LineSeriesOption, PieSeriesOption, BarSeriesOption } from 'echarts/charts';
import type { TooltipComponentOption, GridComponentOption } from 'echarts/components';

// Mirrors the tree-shaken chart/component set EChartContainer registers — never the full bundle.
export type EChartsOption = ComposeOption<
  LineSeriesOption | PieSeriesOption | BarSeriesOption | TooltipComponentOption | GridComponentOption
>;

// Design tokens from src/app/globals.css (§04-design-system.md §4.7/§14) — no arbitrary
// chart-library default colors.
export const CHART_COLORS = {
  brand: '#1D4ED8',
  brandLight: '#DBEAFE',
  statusNew: '#3B82F6',
  statusProgress: '#EAB308',
  statusCompleted: '#22C55E',
} as const;

// Canvas text can't resolve a CSS custom property, so this repeats the literal family name
// next/font/google loads as `--font-inter` in src/app/layout.tsx.
const CHART_FONT_FAMILY = 'Inter, system-ui, -apple-system, sans-serif';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Shared ECharts option fragment every chart component spreads into its own `option`. */
export function getBaseChartOption(): EChartsOption {
  return {
    animation: !prefersReducedMotion(),
    color: [CHART_COLORS.brand, CHART_COLORS.statusNew, CHART_COLORS.statusProgress, CHART_COLORS.statusCompleted],
    textStyle: {
      fontFamily: CHART_FONT_FAMILY,
      fontSize: 12,
    },
    tooltip: {
      textStyle: { fontFamily: CHART_FONT_FAMILY, fontSize: 12 },
    },
  };
}
