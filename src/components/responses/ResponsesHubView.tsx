'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/common/Toast';
import { ResponsesTable } from './ResponsesTable';
import { ResponsesToolbar } from './ResponsesToolbar';
import { PaginationControls } from './PaginationControls';
import { BulkActionBar } from './BulkActionBar';
import { ResponsesStatCards } from './ResponsesStatCards';
import { ResponseDrawer } from './ResponseDrawer';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { clampResponsePage, normalizeResponsePage, normalizeResponseStatus, runSequentially } from '@/lib/responseList';
import type { PaginatedResponsesResult, ResponseStatus } from '@/types/response';

interface ConfirmDeleteState {
  mode: 'single' | 'bulk';
  ids: string[];
}

const PAGE_LIMIT = 50;

interface ResponsesHubViewProps {
  /** Undefined for the all-forms view reached from the sidebar's "Responses" link. */
  formId?: string;
}

export function ResponsesHubView({ formId }: ResponsesHubViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const search = searchParams.get('search') ?? '';
  const rawStatus = searchParams.get('status');
  const status = normalizeResponseStatus(rawStatus);
  const rawPage = searchParams.get('page');
  const page = normalizeResponsePage(rawPage);
  const responseId = searchParams.get('responseId');
  const listKey = responseKeys.list(formId, { search: search || undefined, status, page, limit: PAGE_LIMIT });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  const replacePage = useCallback((nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (rawPage !== null && rawPage !== String(page)) replacePage(page);
  }, [page, rawPage, replacePage]);

  useEffect(() => {
    if (rawStatus !== null && status === undefined) updateParams({ status: undefined }, true);
    // updateParams intentionally reads the latest searchParams; depending on it would recreate
    // the function and rerun this normalization on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawStatus, status]);

  function updateParams(updates: Record<string, string | undefined>, resetPage = false) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (resetPage) params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }

  function openResponse(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('responseId', id);
    // push, not updateParams (which always replaces) — the back button must close the drawer.
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeResponse() {
    updateParams({ responseId: undefined }); // replace is fine here, closing doesn't need a new history entry
  }

  const {
    data: form,
    error: formError,
    isError: isFormError,
    refetch: refetchForm,
  } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: responseKeys.stats(formId),
    queryFn: () => responsesService.getStats(formId),
  });

  const {
    data,
    isLoading,
    isError: isResponsesError,
    refetch: refetchResponses,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => responsesService.getResponses({ formId, search: search || undefined, status, page, limit: PAGE_LIMIT }),
    refetchInterval: 30_000,
  });

  const responses = data?.data ?? [];

  useEffect(() => {
    if (!data) return;
    const clampedPage = clampResponsePage(page, data.totalPages);
    if (clampedPage !== page) replacePage(clampedPage);
  }, [data, page, replacePage]);

  const invalidateResponses = () => queryClient.invalidateQueries({ queryKey: responseKeys.all(formId) });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, newStatus }: { ids: string[]; newStatus: ResponseStatus }) => {
      await runSequentially(ids, (id) => responsesService.updateStatus(id, newStatus));
    },
    onMutate: async ({ ids, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PaginatedResponsesResult>(listKey);
      queryClient.setQueryData<PaginatedResponsesResult>(listKey, (old) =>
        old ? { ...old, data: old.data.map((r) => (ids.includes(r._id) ? { ...r, status: newStatus } : r)) } : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(listKey, context.previous);
      toast('Failed to update responses. Please try again.', 'error');
    },
    onSuccess: (_data, { ids }) => {
      setSelectedIds(new Set());
      toast(`${ids.length} response${ids.length === 1 ? '' : 's'} updated.`, 'success');
    },
    onSettled: () => invalidateResponses(),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await runSequentially(ids, (id) => responsesService.deleteResponse(id));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<PaginatedResponsesResult>(listKey);
      queryClient.setQueryData<PaginatedResponsesResult>(listKey, (old) =>
        old
          ? { ...old, data: old.data.filter((r) => !ids.includes(r._id)), total: Math.max(old.total - ids.length, 0) }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(listKey, context.previous);
      toast('Failed to delete responses. Please try again.', 'error');
    },
    onSuccess: (_data, ids) => {
      setSelectedIds(new Set());
      toast(`${ids.length} response${ids.length === 1 ? '' : 's'} deleted.`, 'success');
    },
    onSettled: () => {
      invalidateResponses();
      setConfirmDelete(null);
    },
  });

  const singleDeleteMutation = useMutation({
    mutationFn: (id: string) => responsesService.deleteResponse(id),
    onSuccess: () => {
      invalidateResponses();
      toast('Response deleted.', 'success');
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
    onSettled: () => setConfirmDelete(null),
  });

  if (isFormError && formId) {
    const statusCode = isAxiosError(formError) ? formError.response?.status : undefined;
    const isAccessDenied = statusCode === 403;
    const isNotFound = statusCode === 404;
    return (
      <EmptyState
        icon={isAccessDenied ? <LockKeyhole /> : isNotFound ? <FileText /> : <AlertCircle />}
        heading={isAccessDenied ? 'Access denied' : isNotFound ? 'Form not found' : 'Unable to load form'}
        body={
          isAccessDenied
            ? "You don't have permission to view this form's responses."
            : isNotFound
              ? "This form doesn't exist or may have been deleted."
              : 'Something went wrong while loading this form.'
        }
        action={
          isAccessDenied || isNotFound ? (
            <Button onClick={() => router.push('/forms')}>Go to Forms</Button>
          ) : (
            <Button onClick={() => void refetchForm()}>Try again</Button>
          )
        }
      />
    );
  }

  if (isResponsesError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        heading="Unable to load responses"
        body="The response list could not be loaded. Please try again."
        action={<Button onClick={() => void refetchResponses()}>Try again</Button>}
      />
    );
  }

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.mode === 'bulk') bulkDeleteMutation.mutate(confirmDelete.ids);
    else singleDeleteMutation.mutate(confirmDelete.ids[0]);
  };

  const isDeleting = bulkDeleteMutation.isPending || singleDeleteMutation.isPending;

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto animate-fade-in">
      <DashboardHeader
        title="Responses"
        subtitle={formId ? `Responses · ${form?.title ?? ''}` : 'Track, view, and organize submissions across every form.'}
      />

      <ResponsesStatCards
        stats={stats}
        isLoading={statsLoading}
        isError={isStatsError}
        onRetry={() => void refetchStats()}
      />

      <ResponsesToolbar
        search={search}
        status={status ?? 'all'}
        total={data?.total ?? 0}
        onSearchChange={(v) => {
          setSelectedIds(new Set());
          updateParams({ search: v || undefined }, true);
        }}
        onStatusChange={(s) => {
          setSelectedIds(new Set());
          updateParams({ status: s === 'all' ? undefined : s }, true);
        }}
      />

      <BulkActionBar
        count={selectedIds.size}
        isLoading={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
        onMarkInProgress={() => bulkStatusMutation.mutate({ ids: [...selectedIds], newStatus: 'in_progress' })}
        onMarkCompleted={() => bulkStatusMutation.mutate({ ids: [...selectedIds], newStatus: 'completed' })}
        onDeleteSelected={() => setConfirmDelete({ mode: 'bulk', ids: [...selectedIds] })}
      />

      <ResponsesTable
        responses={responses}
        isLoading={isLoading}
        selectedIds={selectedIds}
        formId={formId}
        hasActiveSearch={!!search}
        onClearSearch={() => {
          setSelectedIds(new Set());
          updateParams({ search: undefined }, true);
        }}
        onSelectAll={(checked) =>
          setSelectedIds(checked ? new Set(responses.map((r) => r._id)) : new Set())
        }
        onSelectRow={(id, checked) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        onViewResponse={openResponse}
        onDeleteResponse={(id) => setConfirmDelete({ mode: 'single', ids: [id] })}
      />

      <PaginationControls
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={(p) => {
          setSelectedIds(new Set());
          updateParams({ page: String(p) });
        }}
      />

      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.mode === 'bulk' ? `Delete ${confirmDelete.ids.length} responses?` : 'Delete this response?'}
        description={
          confirmDelete?.mode === 'bulk'
            ? 'This cannot be undone.'
            : 'This will permanently delete the response and all uploaded files. This action cannot be undone.'
        }
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </Modal>

      <ResponseDrawer responseId={responseId} formId={formId} onClose={closeResponse} />
    </div>
  );
}
