import type { CSSProperties } from 'react';
import type { Palette } from '@/types/chartBuilder';

// Named palettes for a chart. "theme" sets nothing: the chart uses the app's own colours (and so follows light / dark / the theme).
// The others re-point the six colour tokens the in-house charts draw with (components/ui/charts: seriesColor and CHART_COLOR.primary)
// inside the element they are applied to: put it around the picture only, not around buttons. Mid-tone hues that stay readable on both a
// light and a dark card.

const SERIES_TOKENS = ['--action-primary', '--info', '--success', '--warning', '--error', '--action-secondary'];

export const PALETTES: { id: Palette; name: string; dots: string[] }[] = [
  { id: 'theme', name: 'Theme', dots: [] },
  { id: 'ocean', name: 'Ocean', dots: ['#2563EB', '#0891B2', '#0D9488', '#6366F1', '#38BDF8', '#64748B'] },
  { id: 'sunset', name: 'Sunset', dots: ['#EA580C', '#DB2777', '#D97706', '#DC2626', '#9333EA', '#F59E0B'] },
  { id: 'forest', name: 'Forest', dots: ['#16A34A', '#65A30D', '#0F766E', '#CA8A04', '#15803D', '#84CC16'] },
  { id: 'mono', name: 'Mono', dots: ['#334155', '#64748B', '#94A3B8', '#475569', '#CBD5E1', '#1E293B'] },
];

/** The style to put on the element around a chart. Empty for the theme palette. */
export function paletteStyle(palette: Palette | undefined): CSSProperties {
  const found = PALETTES.find((p) => p.id === palette);
  if (!found || found.dots.length === 0) return {};
  return Object.fromEntries(found.dots.map((c, i) => [SERIES_TOKENS[i], c])) as CSSProperties;
}
