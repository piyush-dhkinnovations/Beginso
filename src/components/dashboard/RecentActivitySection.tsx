'use client';

import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FileInput, Plus } from 'lucide-react';
import Link from 'next/link';

interface RecentActivitySectionProps {
  hasForms?: boolean;
}

// ponytail: No activity feed data source yet (see dashboard/page.tsx responsesThisMonth).
// Upgrade path: once the backend exposes a real activity/timeline endpoint, render it here.
export function RecentActivitySection({ hasForms = false }: RecentActivitySectionProps) {
  return (
    <div className="border border-neutral-200 rounded-lg p-6 bg-white space-y-4">
      <h3 className="text-heading-2 text-neutral-900 font-bold">Recent Activity</h3>
      <EmptyState
        icon={<FileInput size={24} />}
        heading={hasForms ? 'No recent activity' : 'No forms created yet'}
        body={
          hasForms
            ? 'Activity will show up here as your forms collect responses.'
            : 'Get started by creating your first Beginso form.'
        }
        action={
          hasForms ? undefined : (
            <Link href="/forms">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus size={16} />
                <span>Create your first form</span>
              </Button>
            </Link>
          )
        }
      />
    </div>
  );
}
