'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/services/events';
import { activityKeys } from '@/lib/queryKeys';
import { PageHeader, Card, Alert, Button, Skeleton } from '@/components/ui';
import { ActivityFeed } from '@/components/workspaces/ActivityFeed';

const PAGE_SIZE = 20;

// Workspace Activity — requirements.md §7.6, design.md §5/§15.2. Every member can see it (no role
// gate, unlike the Audit Log); 403 for a non-member is already handled by /w/[slug]/layout.tsx.
// Previous/Next rather than ui/Pagination: the events contract returns a bare array with no total
// (design.md §11.2), so there is no page count to give it — Next is offered only after a full page.
export default function WorkspaceActivityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: activityKeys.list(slug, page),
    queryFn: () => eventsService.listWorkspaceActivity(slug, page, PAGE_SIZE),
  });

  const hasNext = (data?.length ?? 0) >= PAGE_SIZE;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Activity" description="What's been happening in this workspace." />

      <Card className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3" aria-label="Loading activity">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="text" width="100%" height={18} />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="error" title="We could not load activity.">
            <Button variant="secondary" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <>
            <ActivityFeed events={data ?? []} />
            {(page > 1 || hasNext) && (
              <div className="flex items-center justify-between">
                <Button variant="secondary" size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="bg-caption">Page {page}</span>
                <Button variant="secondary" size="small" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
