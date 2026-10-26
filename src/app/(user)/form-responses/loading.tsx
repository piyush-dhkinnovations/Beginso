import { PageHeader } from '@/components/ui/PageHeader';
import { CardGridSkeleton, ToolbarSkeleton } from '@/components/ui/PageSkeletons';

// The same skeleton ResponsesLanding shows while its forms load.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Responses" />
      <ToolbarSkeleton />
      <CardGridSkeleton count={8} columns={4} />
    </div>
  );
}
