'use client';

import { usePathname } from 'next/navigation';
import { RouteLoading } from '@/components/errors/RouteLoading';
import { InsightsBodySkeleton, ResponsesBodySkeleton } from '@/components/ui/PageSkeletons';

// Everything under a single form (overview, inbox, builder ...). The form's data pages already have their header from the layout, so
// they get the skeleton of their own body (the same one the page shows while it loads); every other page keeps the generic shape.
// (The Forms list's own loading.tsx must not replace this one.)
export default function Loading() {
  const path = usePathname();
  if (/\/forms\/[^/]+\/inbox\/?$/.test(path)) return <ResponsesBodySkeleton />;
  if (/\/forms\/[^/]+\/insights\/?$/.test(path)) return <InsightsBodySkeleton />;
  return <RouteLoading />;
}
