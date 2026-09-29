'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ResponsesTable } from './ResponsesTable';
import { ResponsesToolbar } from './ResponsesToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { PaginationControls } from './PaginationControls';
import { BulkActionBar } from './BulkActionBar';
import { ResponsesStatCards } from './ResponsesStatCards';
import { ResponseDrawer } from './ResponseDrawer';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { useMembers } from '@/hooks/useMembers';
import type { IResponse } from '@/types/response';

interface ConfirmDeleteState {
  mode: 'single' | 'bulk';
  ids: string[];
}

interface ResponsesHubViewProps {
  /** Undefined for the all-forms view reached from the sidebar's "Responses" link. */
  formId?: string;
  /** Workspace slug, or 'personal' for the two existing personal-shell routes (OQ-1). Sprint 12's
   * workspace Inbox route (task 1.9) passes its slug; both existing (user)/responses routes keep
   * the default, unchanged behaviour. */
  scope?: string;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.2 (2.3), design.md §5/§7 (task 1.8): shrunk
 * to composition — URL/filter state lives in `useInboxFilters`, every write in
 * `useInboxMutations`. Board/Calendar/Chart sub-views and saved views are later phases (3.x/2.6);
 * this still only renders the Table.
 */
export function ResponsesHubView({ formId, scope = 'personal' }: ResponsesHubViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { filters, page, search, pageLimit, stages, setFilters, setPage, clear } = useInboxFilters({ scope });
  const { data: members } = useMembers(scope === 'personal' ? undefined : scope);
  const mutations = useInboxMutations({ scope, formId });

  const responseId = searchParams.get('responseId');
  const listKey = responseKeys.list(scope, formId, { ...filters, page, limit: pageLimit });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  const replacePage = useCallback((nextPage: number) => setPage(nextPage), [setPage]);

  function openResponse(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('responseId', id);
    // push, not replace — the back button must close the drawer.
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeResponse() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('responseId');
    router.replace(`${pathname}?${params.toString()}`);
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
    queryKey: responseKeys.stats(scope, formId),
    queryFn: () => responsesService.getStats(formId, scope),
  });

  const {
    data,
    isLoading,
    isError: isResponsesError,
    refetch: refetchResponses,
  } = useQuery({
    queryKey: listKey,
    queryFn: () => responsesService.getResponses({ formId, ...filters, page, limit: pageLimit }, scope),
    // Polling stays on the list only (design.md §10/§20); must not clear selection or open detail —
    // neither selection nor the drawer's responseId lives in this query, so a refetch can't touch them.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const responses = data?.data ?? [];
  const activeResponseIndex = responseId ? responses.findIndex((response) => response._id === responseId) : -1;
  const activeResponsePosition = activeResponseIndex >= 0 ? (page - 1) * pageLimit + activeResponseIndex + 1 : undefined;
  const fileFieldLabels = (form?.fields ?? [])
    .filter((field) => field.type === 'file_upload' && !field.deleted)
    .sort((a, b) => a.order - b.order)
    .map((field) => field.label);

  async function navigateResponse(direction: 'previous' | 'next') {
    if (activeResponseIndex < 0 || !data) return;

    let targetPage = page;
    let target: IResponse | undefined = responses[activeResponseIndex + (direction === 'previous' ? -1 : 1)];

    if (!target) {
      targetPage = page + (direction === 'previous' ? -1 : 1);
      if (targetPage < 1 || targetPage > data.totalPages) return;
      const adjacentPage = await responsesService.getResponses(
        { formId, ...filters, page: targetPage, limit: pageLimit },
        scope
      );
      target = direction === 'previous' ? adjacentPage.data.at(-1) : adjacentPage.data[0];
    }

    if (target) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(targetPage));
      params.set('responseId', target._id);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }

  useEffect(() => {
    if (!data) return;
    const clampedPage = Math.min(Math.max(page, 1), Math.max(data.totalPages, 1));
    if (clampedPage !== page) replacePage(clampedPage);
  }, [data, page, replacePage]);

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
    if (confirmDelete.mode === 'bulk') {
      mutations.bulkDelete(confirmDelete.ids, {
        onSettled: () => setConfirmDelete(null),
        onSuccess: () => setSelectedIds(new Set()),
      });
    } else {
      mutations.singleDelete(confirmDelete.ids[0], { onSettled: () => setConfirmDelete(null) });
    }
  };

  const isDeleting = mutations.isBulkDeleting || mutations.isSingleDeleting;
  const hasActiveFilters = !!search || !!filters.stageId || !!filters.assigneeId || !!filters.unread;

  return (
    // Keeping this container out of an animated opacity stacking context is important:
    // ResponseDrawer is position:fixed, and must be able to layer above the fixed TopNav.
    // AppShell owns page width (CLAUDE.md) — this component sets none of its own.
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Responses"
        description={formId ? `Responses · ${form?.title ?? ''}` : 'Track, view, and organize submissions across every form.'}
      />

      <ResponsesStatCards
        stats={stats}
        isLoading={statsLoading}
        isError={isStatsError}
        onRetry={() => void refetchStats()}
      />

      <ResponsesToolbar
        search={search}
        filters={filters}
        stages={stages}
        members={scope === 'personal' ? undefined : members}
        total={data?.total ?? 0}
        onSearchChange={(v) => {
          setSelectedIds(new Set());
          setFilters({ q: v || undefined }, { resetPage: true });
        }}
        onFilterChange={(patch) => {
          setSelectedIds(new Set());
          setFilters(patch, { resetPage: true });
        }}
      />

      <ActiveFilterChips
        filters={filters}
        stages={stages}
        onRemove={(key) => setFilters({ [key]: undefined }, { resetPage: true })}
        onClearAll={() => {
          setSelectedIds(new Set());
          clear();
        }}
      />

      <BulkActionBar
        count={selectedIds.size}
        stages={stages}
        isLoading={mutations.isBulkUpdatingStage || mutations.isBulkDeleting}
        onChangeStage={(stageId) => mutations.bulkUpdateStage({ ids: [...selectedIds], stageId }, { onSuccess: () => setSelectedIds(new Set()) })}
        onDeleteSelected={() => setConfirmDelete({ mode: 'bulk', ids: [...selectedIds] })}
      />

      <ResponsesTable
        responses={responses}
        isLoading={isLoading}
        selectedIds={selectedIds}
        formId={formId}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={() => {
          setSelectedIds(new Set());
          clear();
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
          setPage(p);
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
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </Modal>

      <ResponseDrawer
        responseId={responseId}
        formId={formId}
        scope={scope}
        formTitle={form?.title}
        fileFieldLabels={fileFieldLabels}
        stages={stages}
        position={activeResponsePosition}
        totalResponses={data?.total}
        hasPrevious={activeResponsePosition !== undefined && activeResponsePosition > 1}
        hasNext={activeResponsePosition !== undefined && activeResponsePosition < (data?.total ?? 0)}
        onPrevious={() => void navigateResponse('previous')}
        onNext={() => void navigateResponse('next')}
        onExpand={(response) => {
          const returnTo = `${pathname}?${searchParams.toString()}`;
          const fullPageParams = new URLSearchParams({
            formId: response.formId,
            returnTo,
          });
          router.push(`/responses/${response._id}?${fullPageParams.toString()}`);
        }}
        onClose={closeResponse}
      />
    </div>
  );
}
