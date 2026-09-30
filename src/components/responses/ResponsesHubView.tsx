'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsesTable } from './ResponsesTable';
import { ResponsesBoard } from './ResponsesBoard';
import { ResponsesCalendar } from './ResponsesCalendar';
import { ResponsesToolbar } from './ResponsesToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { PaginationControls } from './PaginationControls';
import { BulkActionBar } from './BulkActionBar';
import { ResponsesStatCards } from './ResponsesStatCards';
import { ResponseDrawer } from './ResponseDrawer';
import { SavedViewSelect } from './SavedViewSelect';
import { SaveViewModal } from './SaveViewModal';
import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { reportsService } from '@/services/reports';
import { viewsService } from '@/services/views';
import { responseKeys, viewKeys } from '@/lib/queryKeys';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { useMembers } from '@/hooks/useMembers';
import { useTags } from '@/hooks/useTags';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceTimezone } from '@/hooks/useWorkspaceTimezone';
import { useToast } from '@/components/common/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { hasCapability } from '@/lib/roles';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import type { InboxViewMode } from '@/lib/inboxFilters';
import type { IResponse, BulkTarget } from '@/types/response';
import type { SavedView } from '@/types/savedView';

// Sprint 12 (inbox-collaboration), design.md §20 (task 3.4): "Chart components lazy-loaded
// (next/dynamic)" — echarts is the heaviest dependency this view can pull in, and most sessions
// never switch to the Chart tab, so it's only fetched once someone does. `ssr: false` matches
// EChartContainer's own canvas-only nature (it already needs `window`/`ResizeObserver`).
const ResponsesChart = dynamic(() => import('./ResponsesChart').then((m) => m.ResponsesChart), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-busy="true">
      <Skeleton variant="block" height={240} className="rounded-lg" />
      <Skeleton variant="block" height={240} className="rounded-lg" />
    </div>
  ),
});

const VIEW_TABS = [
  { id: 'table', label: 'Table' },
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'chart', label: 'Chart' },
];

interface ConfirmDeleteState {
  mode: 'single' | 'bulk';
  target: BulkTarget;
  count: number;
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

  const { filters, page, view, search, pageLimit, stages, stagesLoading, setFilters, setPage, setView, clear } = useInboxFilters({ scope });
  const { data: members } = useMembers(scope === 'personal' ? undefined : scope);
  const { data: tags } = useTags(scope === 'personal' ? undefined : scope);
  const role = useWorkspaceRole(scope);
  const timezone = useWorkspaceTimezone(scope);
  const mutations = useInboxMutations({ scope, formId });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Sprint 12 (inbox-collaboration), requirements.md §7.6 (task 2.6). Views are a workspace
  // concept (OQ-9) — not fetched for the personal shell, same gate `useTags`/`useMembers` apply.
  const { data: views } = useQuery({
    queryKey: viewKeys.list(scope, formId),
    queryFn: () => viewsService.list(scope, formId),
    enabled: scope !== 'personal',
  });
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [activeViewId, setActiveViewId] = useState<string | undefined>();
  const canCreateTeamView = role === 'owner' || role === 'admin' || role === 'editor' || role === 'member';

  function invalidateViews() {
    queryClient.invalidateQueries({ queryKey: viewKeys.list(scope, formId) });
  }

  function applyView(view: SavedView) {
    setActiveViewId(view.id);
    clearSelection();
    setFilters({ ...view.filters, view: view.viewMode }, { resetPage: true });
  }

  function clearAppliedView() {
    setActiveViewId(undefined);
  }

  function saveView(values: { name: string; visibility: 'personal' | 'team' }) {
    // Sprint 12 (inbox-collaboration), task 3.1: was hardcoded to 'table' (yesterday's report) —
    // Save view now captures whichever view is actually active.
    viewsService
      .create(scope, { name: values.name, visibility: values.visibility, formId: formId ?? null, filters, viewMode: view })
      .then((savedView) => {
        invalidateViews();
        setActiveViewId(savedView.id);
        setSaveViewOpen(false);
        toast('View saved.', 'success');
      })
      .catch(() => toast('Failed to save the view. Please try again.', 'error'));
  }

  function renameView(view: SavedView, name: string) {
    viewsService
      .update(scope, view.id, { name })
      .then(() => {
        invalidateViews();
        toast('View renamed.', 'success');
      })
      .catch(() => toast('Failed to rename the view. Please try again.', 'error'));
  }

  function deleteView(view: SavedView) {
    viewsService
      .remove(scope, view.id)
      .then(() => {
        invalidateViews();
        if (activeViewId === view.id) clearAppliedView();
        toast('View deleted.', 'success', undefined, {
          label: 'Undo',
          onClick: () =>
            viewsService
              .create(scope, { name: view.name, visibility: view.visibility, formId: view.formId, filters: view.filters, viewMode: view.viewMode })
              .then(() => {
                invalidateViews();
                toast('View restored.', 'success');
              })
              .catch(() => toast('Failed to restore the view.', 'error')),
        });
      })
      .catch(() => toast('Failed to delete the view. Please try again.', 'error'));
  }

  const responseId = searchParams.get('responseId');
  const listKey = responseKeys.list(scope, formId, { ...filters, page, limit: pageLimit });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }

  const canExport = role !== undefined && hasCapability(role, 'responses:export');

  function runExport(target: BulkTarget) {
    reportsService
      .createReport(exportPayloadFromTarget('csv', target))
      .then(() => toast('Export started. Find it under Reports when it finishes.', 'success'))
      .catch(() => toast('Failed to start the export. Please try again.', 'error'));
  }

  function exportCurrentFilter() {
    reportsService
      .createReport(exportPayloadFromFilters('csv', formId, filters))
      .then(() => toast('Export started. Find it under Reports when it finishes.', 'success'))
      .catch(() => toast('Failed to start the export. Please try again.', 'error'));
  }

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
      mutations.bulk(confirmDelete.target, { type: 'delete' }, {
        attemptedIds: 'ids' in confirmDelete.target ? confirmDelete.target.ids : undefined,
        onSettled: () => setConfirmDelete(null),
        onSuccess: () => clearSelection(),
      });
    } else if ('ids' in confirmDelete.target) {
      mutations.singleDelete(confirmDelete.target.ids[0], { onSettled: () => setConfirmDelete(null) });
    }
  };

  const isDeleting = mutations.isBulkRunning || mutations.isSingleDeleting;
  const hasActiveFilters = !!search || !!filters.stageId || !!filters.assigneeId || !!filters.unread;

  return (
    // Keeping this container out of an animated opacity stacking context is important:
    // ResponseDrawer is position:fixed, and must be able to layer above the fixed TopNav.
    // AppShell owns page width (CLAUDE.md) — this component sets none of its own.
    <div className="flex flex-col gap-4">
      <PageHeader
        title={scope !== 'personal' ? 'Inbox' : 'Responses'}
        description={formId ? `Responses · ${form?.title ?? ''}` : 'Track, view, and organize submissions across every form.'}
        actions={
          canExport ? (
            <Button variant="secondary" size="small" onClick={exportCurrentFilter}>
              Export
            </Button>
          ) : undefined
        }
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
          clearSelection();
          setFilters({ q: v || undefined }, { resetPage: true });
        }}
        onFilterChange={(patch) => {
          clearSelection();
          setFilters(patch, { resetPage: true });
        }}
      />

      <Tabs
        tabs={VIEW_TABS}
        activeId={view}
        onChange={(id) => setView(id as InboxViewMode)}
        ariaLabel="Responses view"
      />

      <ActiveFilterChips
        filters={filters}
        stages={stages}
        onRemove={(key) => setFilters({ [key]: undefined }, { resetPage: true })}
        onClearAll={() => {
          clearSelection();
          clear();
        }}
      />

      {scope !== 'personal' && (
        <div className="flex items-center gap-3">
          <SavedViewSelect
            views={views ?? []}
            currentUserId={user?.id ?? ''}
            activeViewId={activeViewId}
            stages={stages}
            tags={tags}
            members={members}
            role={role}
            onApply={applyView}
            onClearApplied={clearAppliedView}
            onRename={renameView}
            onDelete={deleteView}
          />
          <Button variant="secondary" size="small" onClick={() => setSaveViewOpen(true)}>
            Save view
          </Button>
        </div>
      )}

      {/* Sprint 12 (inbox-collaboration), task 3.1: selection/bulk and pagination are Table-only —
          selectedIds only ever gets populated via the Table's own checkboxes, and Board/Calendar/
          Chart each own their data fetching (per-column/per-month/per-range), not this page's
          single `data` query. */}
      {view === 'table' && (
        <>
          <BulkActionBar
            selectedIds={[...selectedIds]}
            selectAllMatching={selectAllMatching}
            totalMatching={data?.total}
            onToggleSelectAllMatching={setSelectAllMatching}
            filters={filters}
            formId={formId}
            stages={stages}
            tags={scope === 'personal' ? undefined : tags}
            members={scope === 'personal' ? undefined : members}
            role={role}
            isLoading={mutations.isBulkRunning}
            onBulk={(target, action) => mutations.bulk(target, action, { onSuccess: () => clearSelection() })}
            onDeleteRequest={(target, count) => setConfirmDelete({ mode: 'bulk', target, count })}
            onExport={runExport}
            onClear={clearSelection}
          />

          <ResponsesTable
            responses={responses}
            isLoading={isLoading}
            selectedIds={selectedIds}
            formId={formId}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => {
              clearSelection();
              clear();
            }}
            onSelectAll={(checked) => {
              setSelectAllMatching(false);
              setSelectedIds(checked ? new Set(responses.map((r) => r._id)) : new Set());
            }}
            onSelectRow={(id, checked) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(id);
                else next.delete(id);
                return next;
              })
            }
            onViewResponse={openResponse}
            onDeleteResponse={(id) => setConfirmDelete({ mode: 'single', target: { ids: [id] }, count: 1 })}
          />

          <PaginationControls
            page={page}
            totalPages={data?.totalPages ?? 1}
            onPageChange={(p) => {
              clearSelection();
              setPage(p);
            }}
          />
        </>
      )}

      {view === 'board' && (
        <ResponsesBoard
          scope={scope}
          formId={formId}
          filters={filters}
          stages={stages}
          stagesLoading={stagesLoading}
          role={role}
          onViewResponse={openResponse}
          onChangeStage={(id, stageId) => mutations.updateStage(id, stageId)}
        />
      )}

      {view === 'calendar' && (
        <ResponsesCalendar
          scope={scope}
          formId={formId}
          filters={filters}
          timezone={timezone}
          onViewResponse={openResponse}
        />
      )}

      {view === 'chart' && (
        <ResponsesChart
          scope={scope}
          formId={formId}
          filters={filters}
          stats={stats}
          statsLoading={statsLoading}
          statsError={isStatsError}
          onRetryStats={() => void refetchStats()}
        />
      )}

      <Modal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.mode === 'bulk' ? `Delete ${confirmDelete.count} responses?` : 'Delete this response?'}
        description={
          confirmDelete?.mode === 'bulk'
            ? 'You can undo this from the toast after deleting.'
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

      <SaveViewModal
        isOpen={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        canCreateTeamView={canCreateTeamView}
        isSaving={false}
        onSave={saveView}
      />

      <ResponseDrawer
        responseId={responseId}
        formId={formId}
        scope={scope}
        onOpenResponse={openResponse}
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
