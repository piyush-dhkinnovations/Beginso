'use client';

import { usePathname } from 'next/navigation';
import { RouteLoading } from '@/components/errors/RouteLoading';
import { InsightsBodySkeleton, ResponsesBodySkeleton } from '@/components/ui/PageSkeletons';

// Everything under a single form (overview, inbox, builder ...). The form's data pages already have their header from the layout, so
// they get the skeleton of their own body (the same one the page shows while it loads); every other page keeps the generic shape.
// (The Forms list's own loading.tsx must not replace this one.)
export default function Loading() {
  const path = usePathname();
  // The form preview (also the frames inside it and the Branding studio) is a document of its own: the app's generic loading
  // shape would show the dashboard for a moment before the form. It is blank here, because the preview draws one placeholder
  // of its own (components/preview/PreviewFrame) and a second one before it looked like loading twice.
  if (/\/forms\/[^/]+\/preview\/?$/.test(path)) {
    return <div className="fixed inset-0 z-50 bg-transparent" role="status" aria-label="Loading the form preview" />;
  }
  if (/\/forms\/[^/]+\/inbox\/?$/.test(path)) return <ResponsesBodySkeleton />;
  if (/\/forms\/[^/]+\/insights\/?$/.test(path)) return <InsightsBodySkeleton />;
  return <RouteLoading />;
}
