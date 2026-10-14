import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsBodySkeleton } from '@/components/ui/PageSkeletons';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Account settings" description="Manage your profile, security, and notification preferences." />
      <SettingsBodySkeleton />
    </div>
  );
}
