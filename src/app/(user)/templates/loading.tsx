import { PageHeader } from '@/components/ui/PageHeader';
import { CardGridSkeleton } from '@/components/ui/PageSkeletons';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Templates" />
      <CardGridSkeleton count={8} columns="wide" media />
    </div>
  );
}
