import { PageHeader } from '@/components/ui/PageHeader';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function Loading() {
  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader eyebrow="Account" title="All workspaces" />
      <CardGridSkeleton count={3} />
    </div>
  );
}
