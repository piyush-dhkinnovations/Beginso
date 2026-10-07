'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '@/services/events';
import { activityKeys } from '@/lib/queryKeys';
import { PageHeader, Alert, Button, Skeleton, FilterChips, FilterMenu, Toolbar } from '@/components/ui';
import { formatRelativeTime } from '@/lib/formatters';
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
    placeholderData: keepPreviousInScope(activityKeys.list(slug, page)),
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

  // Counts and facts cover the events on the loaded page only — the events contract has no total or server-side filter.
  const loaded = data ?? [];
  const categoryCount = (c: ActivityCategory) => loaded.filter((e) => categoryOf(e.action) === c).length;
  const headerFacts = loaded.length
    ? [
        `${loaded.length} event${loaded.length === 1 ? '' : 's'} on this page`,
        `${people.length} ${people.length === 1 ? 'person' : 'people'}`,
        `latest ${formatRelativeTime(loaded[0].createdAt)}`,
      ].join(' · ')
    : undefined;
  const filterName = [person && `from ${person}`, category && `in ${ACTIVITY_CATEGORY_LABEL[category]}`].filter(Boolean).join(' ');
  const otherEvents = loaded.length - visible.length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Activity" description={headerFacts} />

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
            {loaded.length > 0 && (
              <>
                <FilterChips
                  ariaLabel="Filter activity by type (counts for this page)"
                  activeId={category || 'all'}
                  onChange={(id) => setCategory(id === 'all' ? '' : (id as ActivityCategory))}
                  chips={[
                    { id: 'all', label: 'All', count: loaded.length },
                    ...(Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[]).map((c) => ({ id: c, label: ACTIVITY_CATEGORY_LABEL[c], count: categoryCount(c) })),
                  ]}
                />
                <Toolbar>
                  <FilterMenu
                    label="Person"
                    options={people.map((p) => ({ id: p, label: p }))}
                    selectedIds={person ? [person] : []}
                    clearLabel="Everyone"
                    onSelect={setPerson}
                    onClear={() => setPerson('')}
                  />
                </Toolbar>
              </>
            )}
            <ActivityFeed
              events={visible}
              emptyTitle={filtered ? `No activity ${filterName}` : undefined}
              emptyDescription={filtered ? `There ${otherEvents === 1 ? 'is 1 other event' : `are ${otherEvents} other events`} on this page.` : undefined}
              emptyActions={
                filtered ? (
                  <Button variant="secondary" onClick={() => { setPerson(''); setCategory(''); }}>
                    Clear filter
                  </Button>
                ) : undefined
              }
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
