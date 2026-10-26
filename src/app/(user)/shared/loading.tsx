import { PageHeader } from '@/components/ui/PageHeader';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Personal space" title="Shared with me" />
      <CardGridSkeleton count={4} columns="wide" />
    </div>
  );
}
