import { WELCOME_DESCRIPTION, welcomeTitle } from '@/lib/welcome';
import { PageHeader } from '@/components/ui/PageHeader';
import { HomeBodySkeleton } from '@/components/ui/PageSkeletons';

// The same header and the same body skeleton the Home page itself shows while it loads, so the two never differ.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Personal space" title={welcomeTitle()} description={WELCOME_DESCRIPTION} />
      <HomeBodySkeleton />
    </div>
  );
}
