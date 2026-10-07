'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText, LockKeyhole } from 'lucide-react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ListFooter } from '@/components/ui/ListFooter';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResponsesTable } from './ResponsesTable';
import { ResponsesBoard } from './ResponsesBoard';
import { ResponsesCalendar } from './ResponsesCalendar';
import { ResponsesToolbar } from './ResponsesToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { BulkActionBar } from './BulkActionBar';
import { ResponsesCountChips } from './ResponsesCountChips';
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
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { hasCapability } from '@/lib/roles';
import { exportPayloadFromFilters, exportPayloadFromTarget } from '@/lib/reportExport';
import { bucketLabel } from '@/lib/chartOptions';
import { formatRelativeTime } from '@/lib/formatters';
import type { InboxViewMode } from '@/lib/inboxFilters';
import type { IResponse, BulkTarget } from '@/types/response';
import type { SavedView } from '@/types/savedView';

// Sprint 12 (inbox-collaboration), design.md §20 (task 3.4): "Chart components lazy-loaded
// (next/dynamic)" — the chart code is only needed on the Chart tab, and most sessions
// never switch to the Chart tab, so it's only fetched once someone does. `ssr: false` keeps
// the measured-width SVG charts (they need `ResizeObserver`) out of server rendering.
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
  /** Undefined for the all-forms view reached from the sidebar's "Inbox" link. */
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
      .then(() => toast('Export started. Find it under Exports when it finishes.', 'success'))
      .catch((e) => toast(getFriendlyErrorMessage(e, { action: 'export responses', fallback: 'Failed to start the export. Please try again.' }), 'error'));
  }

  function exportCurrentFilter() {
    reportsService
      .createReport(exportPayloadFromFilters('csv', formId, filters))
      .then(() => toast('Export started. Find it under Exports when it finishes.', 'success'))
      .catch((e) => toast(getFriendlyErrorMessage(e, { action: 'export responses', fallback: 'Failed to start the export. Please try again.' }), 'error'));
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
    placeholderData: keepPreviousInScope(listKey),
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
      <EmptyState illustration={isAccessDenied ? 'no-access' : isNotFound ? 'not-found' : 'error'}
        icon={isAccessDenied ? <LockKeyhole /> : isNotFound ? <FileText /> : <AlertCircle />}
        title={isAccessDenied ? 'Access denied' : isNotFound ? 'Form not found' : 'Unable to load form'}
        description={
          isAccessDenied
            ? "You don't have permission to view this form's responses."
            : isNotFound
              ? "This form doesn't exist or may have been deleted."
              : 'Something went wrong while loading this form.'
        }
        actions={
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
      <EmptyState illustration="error"
        icon={<AlertCircle />}
        title="Unable to load responses"
        description="The response list could not be loaded. Please try again."
        actions={<Button onClick={() => void refetchResponses()}>Try again</Button>}
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
  const hasActiveFilters =
    !!search || !!filters.stageId || !!filters.assigneeId || !!filters.unread || !!filters.field || !!filters.tagIds?.length || !!filters.from || !!filters.to || !!filters.duplicate;
  // Chart drill-down chip: "Satisfaction: Very satisfied" (date buckets read as plain words).
  const drillField = filters.field ? form?.fields.find((f) => f.fieldId === filters.field) : undefined;
  const fieldChipLabel = filters.field
    ? `${drillField?.label ?? 'Chart filter'}: ${filters.value === undefined ? 'answered' : drillField?.type === 'date' ? bucketLabel(filters.value) : filters.value}`
    : undefined;
  // First run: no response exists yet and nothing is filtered — stats, search, view tabs and
  // filters would all be controls over zero rows, so only the empty state is shown.
  const isFirstRun = !isLoading && !!data && data.total === 0 && !hasActiveFilters && !activeViewId;

  // Page facts: real counts from the stats endpoint; "last submitted" only when the unfiltered newest-first
  // page is on screen (the list is submittedAt-desc, so its first row is the newest response).
  const lastSubmitted = page === 1 && !hasActiveFilters ? responses[0]?.submittedAt : undefined;
  const headerFacts = stats
    ? [
        `${stats.total} response${stats.total === 1 ? '' : 's'}`,
        `${stats.unread} unread`,
        `${stats.byCategory.new} new`,
        lastSubmitted && `last submitted ${formatRelativeTime(lastSubmitted)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;
  // Names what is filtering the list, for the no-results state.
  const filterSummary = [
    filters.stageId && `stage ${stages.find((s) => s.id === filters.stageId)?.name ?? 'unknown'}`,
    filters.unread && 'unread',
    filters.assigneeId && 'that assignee',
    filters.tagIds?.length && 'that tag',
    (filters.from || filters.to) && 'that date range',
    search && `"${search}"`,
    filters.field && (fieldChipLabel ?? 'that chart filter'),
  ]
    .filter(Boolean)
    .join(' + ');

  return (
    // Keeping this container out of an animated opacity stacking context is important:
    // ResponseDrawer is position:fixed, and must be able to layer above the fixed TopNav.
    // AppShell owns page width (CLAUDE.md) — this component sets none of its own.
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Inbox"
        description={headerFacts}
        actions={
          scope !== 'personal' || canExport ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {scope !== 'personal' && (
                <>
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
                </>
              )}
              {canExport && (
                <Button variant="secondary" size="small" onClick={exportCurrentFilter}>
                  Export
                </Button>
              )}
              {scope !== 'personal' && (
                <Button variant="primary" size="small" onClick={() => setSaveViewOpen(true)}>
                  Save view
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {isFirstRun ? (
        <EmptyState
          illustration="empty-inbox"
          icon={<FileText />}
          title="No responses yet"
          description="Once someone submits your published form, their answers land here. Share the link to get started."
          actions={
            formId ? (
              <Button variant="secondary" onClick={() => router.push(`/forms/${formId}/edit?tab=share`)}>
                Share Form
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => router.push('/forms')}>
                Go to Forms
              </Button>
            )
          }
        />
      ) : (
        <>
      <ResponsesCountChips
        stats={isStatsError ? undefined : stats}
        stages={stages}
        filters={filters}
        onFilterChange={(patch) => {
          clearSelection();
          setFilters(patch, { resetPage: true });
        }}
      />

      <ResponsesToolbar
        search={search}
        filters={filters}
        members={scope === 'personal' ? undefined : members}
        tags={scope === 'personal' ? undefined : tags}
        total={data?.total ?? 0}
        onSearchChange={(v) => {
          clearSelection();
          setFilters({ q: v || undefined }, { resetPage: true });
        }}
        onFilterChange={(patch) => {
          clearSelection();
          setFilters(patch, { resetPage: true });
        }}
        viewOptions={VIEW_TABS}
        view={view}
        onViewChange={(id) => setView(id as InboxViewMode)}
      />

      <ActiveFilterChips
        filters={filters}
        stages={stages}
        fieldChipLabel={fieldChipLabel}
        onRemove={(key) =>
          setFilters(key === 'field' ? { field: undefined, value: undefined, granularity: undefined } : { [key]: undefined }, { resetPage: true })
        }
        onClearAll={() => {
          clearSelection();
          clear();
        }}
      />

      {/* Sprint 12 (inbox-collaboration), task 3.1: selection/bulk and pagination are Table-only —
          selectedIds only ever gets populated via the Table's own checkboxes, and Board/Calendar/
          Chart each own their data fetching (per-column/per-month/per-range), not this page's
          single `data` query. */}
      {view === 'table' && (
        // -mt-2 tightens just the gap above the table specifically (the page's other sections
        // keep the parent's gap-4) — the list itself shouldn't have extra breathing room before
        // the header row.
        <div className="flex flex-col gap-4 -mt-2">
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
            filterSummary={filterSummary}
            otherCount={stats && data ? Math.max(0, stats.total - data.total) : undefined}
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

          <ListFooter
            page={page}
            pageSize={pageLimit}
            total={data?.total ?? 0}
            noun="response"
            onPageChange={(p) => {
              clearSelection();
              setPage(p);
            }}
          />
        </div>
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
        </>
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
          // Bug fix, Sprint 12 close-out: `scope` was never passed to the full-page view, which
          // always fell back to its 'personal' default — a workspace response's Stage/prev-next
          // context silently broke (wrong or empty stage list) the moment it was expanded.
          const fullPageParams = new URLSearchParams({
            formId: response.formId,
            scope,
            returnTo,
          });
          router.push(`/inbox/${response._id}?${fullPageParams.toString()}`);
        }}
        onClose={closeResponse}
      />
    </div>
  );
}
