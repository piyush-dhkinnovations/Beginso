import { PageHeader } from '@/components/ui/PageHeader';
import { ListBodySkeleton } from '@/components/ui/PageSkeletons';

// The Forms list. The pages UNDER /forms/[id] have their own loading.tsx (this one would otherwise cover them too).
export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Forms" />
      <ListBodySkeleton />
    </div>
  );
}
