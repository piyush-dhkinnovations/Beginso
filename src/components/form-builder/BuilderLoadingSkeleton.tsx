import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const Bar = ({ className }: { className: string }) => <Skeleton variant="block" className={cn('block', className)} />;

// Mirrors the builder as it will appear: the tabs strip with the save state and Save, the field rail, then the page steps
// and the question cards. Below 1024px the form's name and actions are on the page above the tabs (from 1024px they are in
// the app's top bar) and the rail is a narrow column of icons, which a phone does not show at all.
export function BuilderLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:gap-0" aria-busy="true" aria-label="Loading form">
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center gap-3">
          <Bar className="size-9 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bar className="h-5 w-48 max-w-full" />
            <Bar className="h-3 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Bar className="h-10 w-28" />
          <Bar className="h-10 w-20" />
        </div>
      </div>

      <div className="flex h-12 items-center gap-3 border-b border-(--border-default) sm:gap-6 lg:bg-(--surface-card) lg:px-6">
        <Bar className="h-4 w-12" />
        <Bar className="h-4 w-16 sm:w-20" />
        <Bar className="h-4 w-14 sm:w-16" />
        <div className="flex flex-1 justify-center">
          <Bar className="hidden h-3 w-36 lg:block" />
        </div>
        <Bar className="h-9 w-11 shrink-0 sm:w-22" />
        <Bar className="hidden size-8 sm:block" />
        <Bar className="hidden size-8 sm:block" />
      </div>

      <div className="flex gap-6 lg:gap-0">
        <div className="hidden w-16 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-card) p-2 sm:flex lg:h-[calc(100dvh-6.25rem)] lg:w-60 lg:rounded-none lg:border-y-0 lg:border-l-0 lg:p-3">
          <div className="hidden flex-col gap-2 pb-1 lg:flex">
            <Bar className="h-4 w-24" />
            <Bar className="h-3 w-40" />
            <Bar className="mt-1 h-9 w-full" />
            <Bar className="mt-2 h-3 w-28" />
          </div>
          {Array.from({ length: 9 }, (_, i) => (
            <Bar key={i} className="h-11 w-full shrink-0 lg:h-9" />
          ))}
        </div>

        <div className="min-w-0 flex-1 lg:px-6 lg:pt-3">
          <div className="mx-auto flex w-full max-w-190 flex-col gap-4">
            <div className="flex items-center gap-2 py-2">
              <Bar className="h-9 w-40" />
              <Bar className="h-9 w-28" />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-(--border-default) bg-(--surface-card) p-6">
              <Bar className="h-3 w-28" />
              <Bar className="h-6 w-2/3 max-w-80" />
              <Bar className="h-3 w-1/2 max-w-64" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-4 rounded-xl border border-(--border-default) bg-(--surface-card) p-6">
                <div className="flex items-center justify-between gap-4">
                  <Bar className="h-4 w-40 max-w-full" />
                  <Bar className="h-6 w-20 shrink-0 rounded-full" />
                </div>
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
