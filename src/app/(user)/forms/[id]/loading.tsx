'use client';

import { usePathname } from 'next/navigation';
import { RouteLoading } from '@/components/errors/RouteLoading';
import { InsightsBodySkeleton, ResponsesBodySkeleton } from '@/components/ui/PageSkeletons';
import { Skeleton } from '@/components/ui/Skeleton';

// Everything under a single form (overview, inbox, builder ...). The form's data pages already have their header from the layout, so
// they get the skeleton of their own body (the same one the page shows while it loads); every other page keeps the generic shape.
// (The Forms list's own loading.tsx must not replace this one.)
export default function Loading() {
  const path = usePathname();
  // The form preview (also the frame inside the Branding studio) is a document of its own: the app's generic loading shape would show the
  // dashboard for a moment before the form, so it gets the same quiet placeholder as the preview page itself.
  if (/\/forms\/[^/]+\/preview\/?$/.test(path)) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-(--bg-subtle)" role="status" aria-label="Loading the form preview">
        <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 py-12">
          <Skeleton variant="title" width="60%" height={32} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="block" width="100%" height={56} />
          ))}
        </div>
      </div>
    );
  }
  if (/\/forms\/[^/]+\/inbox\/?$/.test(path)) return <ResponsesBodySkeleton />;
  if (/\/forms\/[^/]+\/insights\/?$/.test(path)) return <InsightsBodySkeleton />;
  return <RouteLoading />;
}
