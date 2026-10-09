'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// Sprint 12 (inbox-collaboration), design.md §20 (task 3.4): "Chart components lazy-loaded
// (next/dynamic)" — the chart code is only needed on the Chart tab, and most sessions
// never switch to the Chart tab, so it's only fetched once someone does. `ssr: false` keeps
// the measured-width SVG charts (they need `ResizeObserver`) out of server rendering.
export const ResponsesChartLazy = dynamic(() => import('./ResponsesChart').then((m) => m.ResponsesChart), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true">
      <Skeleton variant="block" height={240} className="rounded-lg" />
      <Skeleton variant="block" height={240} className="rounded-lg" />
    </div>
  ),
});
