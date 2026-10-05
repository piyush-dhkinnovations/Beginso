'use client';

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
import { Tabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
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

const NO_ITEMS_COPY: Record<TypeTab, string> = {
  all: 'Anything you delete lands here for 30 days before it goes for good.',
  form: 'No deleted forms. A form you delete stays here for 30 days.',
  response: 'No deleted responses. A response you delete stays here for 30 days.',
};

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
    retry: false,
  });

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
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
    onSettled: () => setPendingId(null),
  });

  const purge = useMutation({
    mutationFn: (item: TrashItem) => trashService.purge(scope, item.type, item.id),
    onMutate: (item) => setPendingId(item.id),
    onSuccess: () => {
      toast('Deleted permanently', 'success');
      setPurgeTarget(null);
      refreshAround();
    },
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
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
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  const items = query.data?.items ?? [];
  const totalPages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.limit)) : 1;
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
    body = (
      <EmptyState
        illustration="empty-forms"
        icon={<Trash2 className="bg-icon" aria-hidden="true" />}
        title="Trash is empty"
        description={NO_ITEMS_COPY[tab]}
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
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        eyebrow={isWorkspace ? 'Workspace' : 'Personal space'}
        title="Trash"
        description={
          <>
            Deleted items stay here for 30 days, then are removed permanently. Responses inside a deleted form
            come back with it.
            {query.data && (
              <span className="block mt-1">
                Items in Trash still count toward your storage ({formatFileSize(query.data.storageBytes)}).
              </span>
            )}
          </>
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
        <Tabs
          tabs={TABS}
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
            ? 'The form, its responses, uploaded files and analytics history are destroyed immediately.'
            : 'The response and its uploaded files are destroyed immediately.'
        }
      />
      <EmptyTrashModal
        isOpen={emptyOpen}
        onClose={() => setEmptyOpen(false)}
        onConfirm={() => emptyAll.mutate()}
        isPending={emptyAll.isPending}
        title="Empty trash"
        confirmLabel="Empty trash"
      />
    </div>
  );
}
