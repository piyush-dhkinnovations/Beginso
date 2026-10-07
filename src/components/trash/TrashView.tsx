'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Trash2 } from 'lucide-react';
import { trashService } from '@/services/trash';
import { trashKeys } from '@/lib/queryKeys';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { formatFileSize } from '@/lib/formatters';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FilterChips } from '@/components/ui/FilterChips';
import { ListFooter } from '@/components/ui/ListFooter';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import type { TrashItem, TrashItemType } from '@/types/trash';
import { TrashList } from './TrashList';
import { EmptyTrashModal } from './EmptyTrashModal';

// Sprint 13 (CF5.5), wireframes 41 + 42. One view for both contexts; `scope` is a workspace slug or
// 'personal'. All permission decisions come from the server (`canRestore` / `canPurge`, and a 403 for a role
// that may not see Trash at all) — the nav item being hidden is only a convenience.
type TypeTab = 'all' | TrashItemType;
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'form', label: 'Forms' },
  { id: 'response', label: 'Responses' },
];

const TAB_NOUN: Record<TypeTab, string> = { all: 'items', form: 'forms', response: 'responses' };

export function TrashView({ scope }: { scope: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isWorkspace = scope !== 'personal';
  const [tab, setTab] = useState<TypeTab>('all');
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const typeParam = tab === 'all' ? undefined : tab;
  const query = useQuery({
    queryKey: trashKeys.list(scope, tab, page),
    queryFn: () => trashService.list(scope, { type: typeParam, page, limit: 25 }),
    placeholderData: keepPreviousInScope(trashKeys.list(scope, tab, page)),
    retry: false,
  });

  // Chip counts: one `limit=1` request per type, reading only `total`.
  const useCountQuery = (type: TypeTab) =>
    useQuery({
      queryKey: trashKeys.list(scope, type, 0),
      queryFn: () => trashService.list(scope, { type: type === 'all' ? undefined : type, page: 1, limit: 1 }),
      select: (r) => r.total,
      retry: false,
      staleTime: 30_000,
    });
  const allCount = useCountQuery('all').data;
  const formCount = useCountQuery('form').data;
  const responseCount = useCountQuery('response').data;
  const counts: Record<TypeTab, number | undefined> = { all: allCount, form: formCount, response: responseCount };

  // Anything that comes back from (or leaves) Trash changes the lists it came from.
  const refreshAround = () => {
    void queryClient.invalidateQueries({ queryKey: trashKeys.all(scope) });
    void queryClient.invalidateQueries({ queryKey: ['forms'] }); // the Forms Manager lists (personal + workspace)
    void queryClient.invalidateQueries({ queryKey: ['responses'] });
    void queryClient.invalidateQueries({ queryKey: ['form'] });
  };

  const restore = useMutation({
    mutationFn: (item: TrashItem) => trashService.restore(scope, item.type, item.id),
    onMutate: (item) => setPendingId(item.id),
    onSuccess: (_d, item) => {
      toast(`"${item.name}" restored`, 'success');
      refreshAround();
    },
    // 409 FORM_IN_TRASH carries a sentence naming the form — show the server's words, not a generic one.
    onError: (err, item) => toast(getFriendlyErrorMessage(err, { action: `restore "${item.name}"` }), 'error'),
    onSettled: () => setPendingId(null),
  });

  const purge = useMutation({
    mutationFn: (item: TrashItem) => trashService.purge(scope, item.type, item.id),
    onMutate: (item) => setPendingId(item.id),
    onSuccess: (_d, item) => {
      toast(`"${item.name}" deleted permanently`, 'success');
      setPurgeTarget(null);
      refreshAround();
    },
    onError: (err, item) => toast(getFriendlyErrorMessage(err, { action: `permanently delete "${item.name}"` }), 'error'),
    onSettled: () => setPendingId(null),
  });

  const emptyAll = useMutation({
    mutationFn: () => trashService.empty(scope),
    onSuccess: ({ forms, responses }) => {
      toast(`Trash emptied (${forms} ${forms === 1 ? 'form' : 'forms'}, ${responses} ${responses === 1 ? 'response' : 'responses'})`, 'success');
      setEmptyOpen(false);
      setPage(1);
      refreshAround();
    },
    onError: (err) => toast(getFriendlyErrorMessage(err, { action: 'empty the trash' }), 'error'),
  });

  const items = query.data?.items ?? [];
  const status = (query.error as { response?: { status?: number } } | null)?.response?.status;
  const canEmpty = items.some((i) => i.canPurge);
  const formsHref = isWorkspace ? `/w/${scope}/forms` : '/forms';

  let body: React.ReactNode;
  if (query.isLoading) {
    // Same row count as the wireframe's populated state (4), so nothing jumps when data lands.
    body = (
      <Card padded={false} aria-label="Loading trash">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-(--border-subtle) px-4 py-3 last:border-b-0">
            <Skeleton variant="circle" width={20} height={20} />
            <div className="flex-1">
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="text" width="30%" />
            </div>
            <Skeleton variant="text" width={72} />
          </div>
        ))}
      </Card>
    );
  } else if (query.isError && status === 403) {
    // Permission denied: same shape as an error, lock icon, NO Retry.
    body = (
      <EmptyState
        illustration="no-access"
        icon={<Lock className="bg-icon" aria-hidden="true" />}
        title="Only an Owner or Admin can manage Trash."
        description="Ask an Owner or Admin of this workspace if something was deleted by mistake."
      />
    );
  } else if (query.isError) {
    body = (
      <Alert variant="error" title="We could not load the trash.">
        Check your connection and try again.{' '}
        <Button variant="secondary" size="small" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </Alert>
    );
  } else if (items.length === 0) {
    const otherItems = tab !== 'all' && allCount ? allCount : 0;
    body = tab !== 'all' && otherItems > 0 ? (
      <EmptyState
        illustration="no-results"
        icon={<Trash2 className="bg-icon" aria-hidden="true" />}
        title={`No deleted ${TAB_NOUN[tab]}`}
        description={`There ${otherItems === 1 ? 'is 1 other item' : `are ${otherItems} other items`} in Trash.`}
        actions={
          <Button variant="secondary" onClick={() => { setTab('all'); setPage(1); }}>
            Clear filter
          </Button>
        }
      />
    ) : (
      <EmptyState
        illustration="empty-forms"
        icon={<Trash2 className="bg-icon" aria-hidden="true" />}
        title="Trash is empty"
        description="Anything you delete lands here for 30 days before it goes for good."
        primaryAction={
          <Link href={formsHref}>
            <Button>Back to Forms</Button>
          </Link>
        }
        secondaryAction={
          <Link href={isWorkspace ? `/w/${scope}` : '/dashboard'}>
            <Button variant="secondary">Go to Home</Button>
          </Link>
        }
      />
    );
  } else {
    body = (
      <>
        <TrashList
          items={items}
          pendingId={pendingId}
          onRestore={(item) => restore.mutate(item)}
          onDeleteNow={setPurgeTarget}
        />
        <ListFooter page={page} pageSize={query.data?.limit ?? 25} total={query.data?.total ?? 0} noun={tab === 'response' ? 'response' : tab === 'form' ? 'form' : 'item'} onPageChange={setPage} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        eyebrow={isWorkspace ? 'Workspace' : 'Personal space'}
        title="Trash"
        description={
          query.data && allCount !== undefined
            ? [
                `${allCount} ${allCount === 1 ? 'item' : 'items'}`,
                formCount !== undefined && `${formCount} ${formCount === 1 ? 'form' : 'forms'}`,
                responseCount !== undefined && `${responseCount} ${responseCount === 1 ? 'response' : 'responses'}`,
                `${formatFileSize(query.data.storageBytes)} of storage`,
                'removed permanently after 30 days',
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        actions={
          canEmpty && (
            <Button variant="destructive" onClick={() => setEmptyOpen(true)}>
              <Trash2 size={16} className="mr-2" aria-hidden="true" />
              Empty trash
            </Button>
          )
        }
      />

      {!(query.isError && status === 403) && (
        <FilterChips
          chips={TABS.map((t) => ({ ...t, count: counts[t.id as TypeTab] }))}
          activeId={tab}
          onChange={(id) => {
            setTab(id as TypeTab);
            setPage(1);
          }}
          ariaLabel="Trash item type"
        />
      )}

      {body}

      <EmptyTrashModal
        isOpen={purgeTarget !== null}
        onClose={() => setPurgeTarget(null)}
        onConfirm={() => purgeTarget && purge.mutate(purgeTarget)}
        isPending={purge.isPending}
        title={`Permanently delete "${purgeTarget?.name ?? ''}"`}
        detail={
          purgeTarget?.type === 'form'
            ? typeof purgeTarget.responseCount === 'number'
              ? `The form and its ${purgeTarget.responseCount} ${purgeTarget.responseCount === 1 ? 'response' : 'responses'}, uploaded files and analytics history will be destroyed immediately.`
              : 'The form, its responses (count unavailable), uploaded files and analytics history will be destroyed immediately.'
            : 'The response and its uploaded files will be destroyed immediately.'
        }
      />
      <EmptyTrashModal
        isOpen={emptyOpen}
        onClose={() => setEmptyOpen(false)}
        onConfirm={() => emptyAll.mutate()}
        isPending={emptyAll.isPending}
        title="Empty trash"
        detail={
          tab === 'all' && query.data
            ? `All ${query.data.total} ${query.data.total === 1 ? 'item' : 'items'} in Trash, with their responses, uploaded files and analytics history, will be destroyed immediately.`
            : 'Everything in Trash, with its responses, uploaded files and analytics history, will be destroyed immediately. The exact count is only shown on the All tab.'
        }
        confirmLabel="Empty trash"
      />
    </div>
  );
}
