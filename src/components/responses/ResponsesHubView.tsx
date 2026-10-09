'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResponsesBoard } from './ResponsesBoard';
import { ResponsesCalendar } from './ResponsesCalendar';
import { ResponsesToolbar } from './ResponsesToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ResponsesCountChips } from './ResponsesCountChips';
import { ResponseDrawer } from './ResponseDrawer';
import { SaveViewModal } from './SaveViewModal';
import { ResponsesChartLazy as ResponsesChart } from './ResponsesChartLazy';
import { ResponsesTableSection } from './ResponsesTableSection';
import { ResponsesHeaderActions } from './ResponsesHeaderActions';
import { DeleteResponsesModal } from './DeleteResponsesModal';
import { FormLoadError, NoResponsesYet, ResponsesListError } from './ResponsesLoadErrors';
import { useInboxSelection } from './useInboxSelection';
import { useInboxExports } from './useInboxExports';
import { useSavedViews } from './useSavedViews';
import { useResponsesData } from './useResponsesData';
import { useResponseRouting } from './useResponseRouting';
import { deriveInboxViewModel } from './inboxViewModel';
import { formsService } from '@/services/forms';
import { useInboxFilters } from '@/hooks/useInboxFilters';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { useMembers } from '@/hooks/useMembers';
import { useTags } from '@/hooks/useTags';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { useWorkspaceTimezone } from '@/hooks/useWorkspaceTimezone';
import { useAuth } from '@/hooks/useAuth';
import { hasCapability } from '@/lib/roles';
import type { InboxViewMode } from '@/lib/inboxFilters';

const VIEW_TABS = [
  { id: 'table', label: 'Table' },
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'chart', label: 'Chart' },
];

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
 * `useInboxMutations`; data, selection, saved views, exports and drawer routing each have their own hook.
 */
export function ResponsesHubView({ formId, scope = 'personal' }: ResponsesHubViewProps) {
  const { filters, page, view, search, pageLimit, stages, stagesLoading, setFilters, setPage, setView, clear } = useInboxFilters({ scope });
  const { data: members } = useMembers(scope === 'personal' ? undefined : scope);
  const { data: tags } = useTags(scope === 'personal' ? undefined : scope);
  const role = useWorkspaceRole(scope);
  const timezone = useWorkspaceTimezone(scope);
  const mutations = useInboxMutations({ scope, formId });
  // Same query key the form header uses, so no extra request on a form's own page.
  const { data: scopedForm } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId as string),
    enabled: !!formId,
  });
  // The all-forms view needs each row's form name; the response itself only carries formId.
  const { data: allForms } = useQuery({
    queryKey: ['responses-form-names', scope],
    queryFn: () => formsService.getAllForms(scope === 'personal' ? { type: 'personal' } : { type: 'workspace', workspaceId: scope }),
    enabled: !formId,
    staleTime: 60_000,
  });
  const formNames = formId ? undefined : Object.fromEntries((allForms?.forms ?? []).map((f) => [f._id, f.title]));
  const { user } = useAuth();

  const selection = useInboxSelection();
  const { clearSelection, confirmDelete, setConfirmDelete } = selection;
  const savedViews = useSavedViews({ scope, formId, filters, view, setFilters, role, clearSelection });
  const { activeViewId } = savedViews;
  const canExport = role !== undefined && hasCapability(role, 'responses:export');
  const { runExport, exportCurrentFilter } = useInboxExports({ formId, filters });

  const { form, formError, isFormError, refetchForm, stats, statsLoading, isStatsError, refetchStats, data, isLoading, isResponsesError, refetchResponses } =
    useResponsesData({ scope, formId, filters, page, pageLimit, setPage });
  const { responseId, responses, activeResponsePosition, openResponse, closeResponse, navigateResponse, expandResponse } = useResponseRouting({
    scope, formId, filters, page, pageLimit, data,
  });
  const fileFieldLabels = (form?.fields ?? [])
    .filter((field) => field.type === 'file_upload' && !field.deleted)
    .sort((a, b) => a.order - b.order)
    .map((field) => field.label);

  if (isFormError && formId) return <FormLoadError error={formError} onRetry={() => void refetchForm()} />;
  if (isResponsesError) return <ResponsesListError onRetry={() => void refetchResponses()} />;

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
  const { hasActiveFilters, fieldChipLabel, headerFacts, filterSummary } = deriveInboxViewModel({
    filters, search, stages, page, form, stats, firstResponseSubmittedAt: responses[0]?.submittedAt,
  });
  // First run: no response exists yet and nothing is filtered — stats, search, view tabs and
  // filters would all be controls over zero rows, so only the empty state is shown.
  const isFirstRun = !isLoading && !!data && data.total === 0 && !hasActiveFilters && !activeViewId;

  const scopedMembers = scope === 'personal' ? undefined : members;
  const scopedTags = scope === 'personal' ? undefined : tags;
  const changeFilter = (patch: Parameters<typeof setFilters>[0]) => {
    clearSelection();
    setFilters(patch, { resetPage: true });
  };
  const clearAll = () => {
    clearSelection();
    clear();
  };

  const headerActions =
    scope !== 'personal' || canExport ? (
      <ResponsesHeaderActions
        isWorkspace={scope !== 'personal'}
        canExport={canExport}
        onExport={exportCurrentFilter}
        onSaveView={() => savedViews.setSaveViewOpen(true)}
        views={savedViews.views ?? []}
        currentUserId={user?.id ?? ''}
        activeViewId={activeViewId}
        stages={stages}
        tags={tags}
        members={members}
        role={role}
        onApply={savedViews.applyView}
        onClearApplied={savedViews.clearAppliedView}
        onRename={savedViews.renameView}
        onDelete={savedViews.deleteView}
      />
    ) : undefined;

  return (
    // Keeping this container out of an animated opacity stacking context is important:
    // ResponseDrawer is position:fixed, and must be able to layer above the fixed TopNav.
    // AppShell owns page width (CLAUDE.md) — this component sets none of its own.
    <div className={formId ? 'flex flex-col gap-6' : 'flex flex-col gap-4'}>
      {formId ? (
        // Inside a form the shared form header already names the form and the tab, so there is no second page
        // title: a one-line summary on the left, the page's actions on the right, same as Insights.
        <>
          <h1 className="sr-only">{`Responses: ${scopedForm?.title ?? '…'}`}</h1>
          {(headerFacts || headerActions) && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="bg-body-sm m-0 text-(--text-muted)">{headerFacts}</p>
              {headerActions && <div className="flex flex-wrap items-center gap-3">{headerActions}</div>}
            </div>
          )}
        </>
      ) : (
        <PageHeader title="All responses" description={headerFacts} actions={headerActions} />
      )}

      {isFirstRun ? (
        <NoResponsesYet formId={formId} />
      ) : (
        <>
          <ResponsesCountChips stats={isStatsError ? undefined : stats} stages={stages} filters={filters} onFilterChange={changeFilter} />

          <ResponsesToolbar
            search={search}
            filters={filters}
            members={scopedMembers}
            tags={scopedTags}
            total={data?.total ?? 0}
            onSearchChange={(v) => changeFilter({ q: v || undefined })}
            onFilterChange={changeFilter}
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
            onClearAll={clearAll}
          />

          {view === 'table' && (
            <ResponsesTableSection
              responses={responses}
              isLoading={isLoading}
              selection={selection}
              total={data?.total}
              page={page}
              pageLimit={pageLimit}
              formId={formId}
              formNames={formNames}
              hasActiveFilters={hasActiveFilters}
              filterSummary={filterSummary}
              otherCount={stats && data ? Math.max(0, stats.total - data.total) : undefined}
              filters={filters}
              stages={stages}
              tags={scopedTags}
              members={scopedMembers}
              role={role}
              isBulkRunning={mutations.isBulkRunning}
              onBulk={(target, action) => mutations.bulk(target, action, { onSuccess: () => clearSelection() })}
              onExport={runExport}
              onClearFilters={clearAll}
              onPageChange={(p) => {
                clearSelection();
                setPage(p);
              }}
              onViewResponse={openResponse}
            />
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
            <ResponsesCalendar scope={scope} formId={formId} filters={filters} timezone={timezone} onViewResponse={openResponse} />
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

      <DeleteResponsesModal confirmDelete={confirmDelete} isDeleting={isDeleting} onClose={() => setConfirmDelete(null)} onConfirm={handleConfirmDelete} />

      <SaveViewModal
        isOpen={savedViews.saveViewOpen}
        onClose={() => savedViews.setSaveViewOpen(false)}
        canCreateTeamView={savedViews.canCreateTeamView}
        isSaving={false}
        onSave={savedViews.saveView}
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
        onExpand={expandResponse}
        onClose={closeResponse}
      />
    </div>
  );
}
