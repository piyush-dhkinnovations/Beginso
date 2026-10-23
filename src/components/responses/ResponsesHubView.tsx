'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { FORM_HEADER_SLOT_ID } from '@/lib/formHeaderSlot';
import { ResponsesBoard } from './ResponsesBoard';
import { BoardCardSettings } from './BoardCardSettings';
import { useBoardCardConfig } from '@/lib/boardCard';
import { ResponsesCalendar } from './ResponsesCalendar';
import { ResponsesToolbar } from './ResponsesToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ResponsesCountChips } from './ResponsesCountChips';
import { ResponseDrawer } from './ResponseDrawer';
import { SaveViewModal } from './SaveViewModal';
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

const subscribeNever = () => () => {};

const VIEW_TABS = [
  { id: 'table', label: 'Table' },
  { id: 'board', label: 'Board' },
  { id: 'calendar', label: 'Calendar' },
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
  // Oldest first or newest first by submission time: the server applies it to every page, so it is not part of the page's own sort.
  const [submittedOrder, setSubmittedOrder] = useState<'asc' | 'desc'>('desc');
  const { data: members } = useMembers(scope === 'personal' ? undefined : scope);
  const { data: tags } = useTags(scope === 'personal' ? undefined : scope);
  const role = useWorkspaceRole(scope);
  const timezone = useWorkspaceTimezone(scope);
  const mutations = useInboxMutations({ scope, formId });
  // The all-forms view needs each row's form name; the response itself only carries formId.
  const { data: allForms } = useQuery({
    queryKey: ['responses-form-names', scope],
    queryFn: () => formsService.getAllForms(scope === 'personal' ? { type: 'personal' } : { type: 'workspace', workspaceId: scope }),
    enabled: !formId,
    staleTime: 60_000,
  });
  const formNames = formId ? undefined : Object.fromEntries((allForms?.forms ?? []).map((f) => [f._id, f.title]));
  const { user } = useAuth();
  const [cardConfig, setCardConfig] = useBoardCardConfig(formId);
  // Inside a form, Export sits in the form header beside Edit form (its slot), so the filter row keeps only what shapes the list.
  const headerSlot = useSyncExternalStore(subscribeNever, () => document.getElementById(FORM_HEADER_SLOT_ID), () => null);

  const selection = useInboxSelection();
  const { clearSelection, confirmDelete, setConfirmDelete } = selection;
  const savedViews = useSavedViews({ scope, formId, filters, view, setFilters, role, clearSelection });
  const { activeViewId } = savedViews;
  const canExport = role !== undefined && hasCapability(role, 'responses:export');
  const { runExport, exportCurrentFilter } = useInboxExports({ formId, filters, scope });

  const { form, formError, isFormError, refetchForm, stats, isStatsError, data, isLoading, isResponsesError, refetchResponses } =
    useResponsesData({ scope, formId, filters, page, pageLimit, setPage, submittedOrder });
  const { responseId, responses, activeResponsePosition, openResponse, closeResponse, navigateResponse, expandResponse } = useResponseRouting({
    scope, formId, filters, page, pageLimit, data, submittedOrder,
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

  const exportInHeader = !!formId && !!headerSlot && canExport;
  const headerActions =
    scope !== 'personal' || (canExport && !exportInHeader) ? (
      <ResponsesHeaderActions
        isWorkspace={scope !== 'personal'}
        canExport={canExport && !exportInHeader}
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
        onClearApplied={savedViews.showAllResponses}
        onRename={savedViews.renameView}
        onDelete={savedViews.deleteView}
      />
    ) : undefined;

  return (
    // Keeping this container out of an animated opacity stacking context is important:
    // ResponseDrawer is position:fixed, and must be able to layer above the fixed TopNav.
    // AppShell owns page width (CLAUDE.md) — this component sets none of its own.
    <div className="flex flex-col gap-3">
      {exportInHeader && headerSlot &&
        createPortal(
          <Button variant="secondary" onClick={exportCurrentFilter}>
            Export
          </Button>,
          headerSlot,
        )}
      {!formId && (
        <PageHeader title="All responses" description={headerFacts} actions={headerActions} />
      )}

      {isFirstRun ? (
        <NoResponsesYet formId={formId} />
      ) : (
        <>
          {/* The stage tabs sit on a rule under the page header; inside a form the saved-view picker and Save view share their row. */}
          <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-(--border-default)">
            <ResponsesCountChips stats={isStatsError ? undefined : stats} stages={stages} filters={filters} onFilterChange={changeFilter} />
            {formId && headerActions && <div className="flex flex-wrap items-center gap-3 pb-1.5">{headerActions}</div>}
          </div>

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
            viewControls={view === 'board' && formId ? <BoardCardSettings scope={scope} formId={formId} fields={form?.fields} config={cardConfig} onChange={setCardConfig} /> : undefined}
            activeFilters={
              <ActiveFilterChips
                filters={filters}
                stages={stages}
                fieldChipLabel={fieldChipLabel}
                omit={['stageId', 'unread', 'q']}
                onRemove={(key) =>
                  setFilters(key === 'field' ? { field: undefined, value: undefined, granularity: undefined } : { [key]: undefined }, { resetPage: true })
                }
                onClearAll={clearAll}
              />
            }
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
              submittedOrder={submittedOrder}
              onSubmittedOrderChange={(order) => {
                setSubmittedOrder(order);
                setPage(1);
              }}
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
              cardConfig={cardConfig}
              onChangeStage={(id, stageId) => mutations.updateStage(id, stageId)}
            />
          )}

          {view === 'calendar' && (
            <ResponsesCalendar scope={scope} formId={formId} filters={filters} timezone={timezone} onViewResponse={openResponse} />
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
