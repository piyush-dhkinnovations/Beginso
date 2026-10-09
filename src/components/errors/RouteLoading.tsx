import { Skeleton } from '@/components/ui';

// Page-shaped skeleton: title + description + a row of cards + a large block.
export function RouteLoading() {
  return (
    <div aria-busy="true" aria-live="polite" role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <Skeleton variant="title" width="30%" />
        <Skeleton variant="text" width="50%" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton variant="block" height={96} className="block" />
        <Skeleton variant="block" height={96} className="block" />
        <Skeleton variant="block" height={96} className="block" />
      </div>
      <Skeleton variant="block" height={280} className="block" />
    </div>
  );
}
