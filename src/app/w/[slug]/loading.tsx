'use client';

import { usePathname } from 'next/navigation';
import { RouteLoading } from '@/components/errors/RouteLoading';
import { PageHeader } from '@/components/ui/PageHeader';
import { HomeBodySkeleton } from '@/components/ui/PageSkeletons';

// This file covers every page under /w/[slug]. The workspace Home gets the same skeleton the page itself shows while it loads
// (so there is one skeleton, not a generic one followed by a different one); every other page keeps the generic shape.
export default function Loading() {
  const isHome = /^\/w\/[^/]+\/?$/.test(usePathname());
  if (!isHome) return <RouteLoading />;
  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader title="Home" />
      <HomeBodySkeleton />
    </div>
  );
}
