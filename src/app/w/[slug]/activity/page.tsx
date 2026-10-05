'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/services/events';
import { activityKeys } from '@/lib/queryKeys';
import { PageHeader, Alert, Button, Skeleton, Select } from '@/components/ui';
import { ActivityFeed, ACTIVITY_CATEGORY_LABEL, categoryOf, type ActivityCategory } from '@/components/workspaces/ActivityFeed';

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

  const [person, setPerson] = useState('');
  const [category, setCategory] = useState<ActivityCategory | ''>('');

  const hasNext = (data?.length ?? 0) >= PAGE_SIZE;

  // Filters apply to the page already loaded (the events contract has no server-side filter; the Audit Log
  // is where server-side filtering lives).
  const people = useMemo(() => [...new Set((data ?? []).map((e) => e.actorName))].sort(), [data]);
  const visible = useMemo(
    () => (data ?? []).filter((e) => (!person || e.actorName === person) && (!category || categoryOf(e.action) === category)),
    [data, person, category],
  );
  const filtered = !!person || !!category;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Activity" description="What's been happening in this workspace." />

      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex flex-col gap-3" aria-label="Loading activity">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="text" width="100%" height={44} />
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
            {(data?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-56">
                  <Select id="activity-person" aria-label="Filter by person" value={person} onChange={(e) => setPerson(e.target.value)}>
                    <option value="">Everyone</option>
                    {people.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </div>
                <div className="w-full sm:w-56">
                  <Select id="activity-type" aria-label="Filter by type" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}>
                    <option value="">All activity</option>
                    {(Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[]).map((c) => (
                      <option key={c} value={c}>{ACTIVITY_CATEGORY_LABEL[c]}</option>
                    ))}
                  </Select>
                </div>
                {filtered && (
                  <Button variant="ghost" size="small" onClick={() => { setPerson(''); setCategory(''); }}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
            <ActivityFeed
              events={visible}
              emptyTitle={filtered ? 'No activity matches these filters.' : undefined}
              emptyDescription={filtered ? 'Try a different person or type, or clear the filters.' : undefined}
            />
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
      </div>
    </div>
  );
}
