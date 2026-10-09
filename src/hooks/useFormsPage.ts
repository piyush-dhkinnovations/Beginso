import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { keepPreviousInScope } from '@/lib/queryOptions';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canDeleteForm, canArchiveForm, canPublishTemplate, canCreateForm } from '@/lib/roles';
import { useAuth } from '@/hooks/useAuth';
import { usePinForm } from '@/hooks/usePinForm';
import { useFormsView } from '@/hooks/useFormsView';
import { useDebounce } from '@/hooks/useDebounce';
import { useFormsCounts } from '@/hooks/useFormsCounts';
import { useFormsMutations } from '@/hooks/useFormsMutations';
import type { TableSort } from '@/components/ui/Table';
import type { FormsManagerTab } from '@/components/forms/FormsManagerTabs';
import { PAGE_SIZES, TAB_STATUS, formHref, formsQueryEnabled, sortForms } from '@/components/forms/formsListUtils';
import type { Form, FormStatus } from '@/types/form';
import type { FormsContext } from '@/types/workspace';

export type FormsPageState = ReturnType<typeof useFormsPage>;

export function useFormsPage(context: FormsContext) {
  const { user } = useAuth();
  const router = useRouter();
  const [view, setView] = useFormsView();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formToMove, setFormToMove] = useState<Form | null>(null);
  const [formToShare, setFormToShare] = useState<Form | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [formToTemplate, setFormToTemplate] = useState<Form | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FormStatus | 'all'>('all');
  const [sort, setSort] = useState<TableSort>({ key: 'updated', dir: 'desc' });
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FormsManagerTab>('recent');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Selection UI stays hidden until the user asks for it (double-click a row, or "Select" in the row menu).
  // It leaves again on its own when the last row is deselected.
  const selecting = selectedIds.size > 0;
  // A single click opens the form, but a double-click must not — hold the navigation briefly so the second click can cancel it.
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bulkDeleteConfirming, setBulkDeleteConfirming] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // sprint-11-v2a-hardening 2.5 — real bug found by the context-switch isolation test: this page
  // is shared between /forms and /w/[slug]/forms (Sprint 8), and switching workspace A -> B hits
  // the same route pattern, so Next.js can reuse this exact component instance instead of
  // remounting it. Every per-form modal/selection state above is local useState, so without this
  // reset, an open FormAccessPanel/MoveFormModal/DeleteFormModal kept pointing at the form from
  // the space just left, showing workspace A's form data inside workspace B's page. Query-cache
  // isolation (workspaceKeys.forms() namespaced by context, 2.6) never protected against this —
  // that's a data-fetch key, not local component state.
  //
  // Reset during render (BrandingTab.tsx's own "re-sync when the source changes externally"
  // pattern — CLAUDE.md doesn't want an effect for this), not useEffect: an effect's setState
  // would paint one extra frame with the stale panel still visible before clearing it.
  const contextKey = context.type === 'workspace' ? `workspace:${context.workspaceId}` : 'personal';
  const [syncedContextKey, setSyncedContextKey] = useState(contextKey);
  if (contextKey !== syncedContextKey) {
    setSyncedContextKey(contextKey);
    setIsModalOpen(false);
    setFormToMove(null);
    setFormToShare(null);
    setFormToDelete(null);
    setSelectedIds(new Set());
    setBulkDeleteConfirming(false);
    setPage(1);
  }

  // sprint-11-v2a-hardening 2.3 — real gap found by the cross-role matrix: this page never
  // checked canDeleteForm(role) at all, so bulk delete and the row Delete action were showing
  // (and firing) for every role, not owner-only as requirements.md §7.2 (task 1.2) specified.
  // Same lookup pattern team/page.tsx already established (workspacesService.list() already
  // returns the caller's per-workspace role, confirmed live since Sprint 8 — no need to wait on
  // BE 0.1, which only gates the sidebar's nav visibility). Personal context has no workspace
  // role to look up — a personal form's only possible owner is the caller, so delete is always
  // allowed there (design.md §13's "{owner} × {personal}" cell).
  const { data: callerWorkspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: context.type === 'workspace',
  });
  const currentRole = context.type === 'workspace'
    ? callerWorkspaces?.find((w) => w.slug === context.workspaceId)?.role
    : undefined;
  const canDelete = context.type === 'personal' || canDeleteForm(currentRole);
  // Archive is Owner/Admin (the same tier as publish); personal forms are always the caller's own. Publishing
  // to templates is Editor and above and only exists for workspace forms — templates belong to a workspace.
  const canArchive = context.type === 'personal' || canArchiveForm(currentRole);
  const canMakeTemplate = context.type === 'workspace' && canPublishTemplate(currentRole);
  // Presentation only - POST /api/forms enforces forms:create. Unknown role (still loading) hides it.
  const canCreate = context.type === 'personal' || canCreateForm(currentRole);
  const onArchivedTab = activeTab === 'archived';
  const onPinnedTab = activeTab === 'pinned';
  const pinMutation = usePinForm();

  // Selection is page/filter-scoped, not global — switching tabs, filtering, searching, or
  // paging changes which rows are even on screen, so a selection made before that change would
  // otherwise silently point at forms the user can no longer see (sprint-10-events-migration,
  // task 6.4's own "per-row" framing implies this, not a global cross-page selection).
  const handleTabChange = (tab: FormsManagerTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedIds(new Set());
    const tabStatus = TAB_STATUS[tab];
    if (tabStatus) setStatus(tabStatus);
  };

  const formsListKey = workspaceKeys.forms(
    context,
    { search: debouncedSearch, status, page, limit: pageSize, archived: onArchivedTab ? 'only' : undefined, pinned: onPinnedTab ? true : undefined }
  );
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: formsListKey,
    placeholderData: keepPreviousInScope(formsListKey),
    queryFn: () =>
      formsService.getForms(
        {
          search: debouncedSearch || undefined,
          status: status === 'all' ? undefined : status,
          page,
          limit: pageSize,
          archived: onArchivedTab ? 'only' : undefined,
          pinned: onPinnedTab ? true : undefined,
        },
        context
      ),
    enabled: formsQueryEnabled(activeTab),
  });

  const { allCount, tabCounts, headerFacts } = useFormsCounts(context, data, activeTab, debouncedSearch);

  // First run: nothing exists yet and nothing is filtered. Tabs, search, the status filter and the
  // table header would all be controls over zero rows, so only the empty state is shown.
  const isFirstRun =
    activeTab === 'recent' && status === 'all' && !search && !error && !isLoading && !!data && data.forms.length === 0;

  const { duplicatingId, deletingId, archivingId, duplicateMutation, deleteMutation, archiveMutation, bulkDeleteMutation } =
    useFormsMutations({ context, data, page, setPage, setSelectedIds, setBulkDeleteConfirming });

  const rows = useMemo(
    // Pinned keeps the server order (most recently pinned first); the sort select is hidden there.
    () => (onPinnedTab ? (data?.forms ?? []) : sortForms(data?.forms ?? [], sort)),
    [data, sort, onPinnedTab]
  );
  const maxResponses = Math.max(0, ...rows.map((form) => form.responseCount));
  const allOnPageSelected = rows.length > 0 && rows.every((form) => selectedIds.has(form._id));
  const someOnPageSelected = rows.some((form) => selectedIds.has(form._id)) && !allOnPageSelected;

  // One owner for the row: in a personal space it is always the caller; in a workspace the backend
  // may include `owner` on the row (contract to confirm — form.ts), so read it defensively.
  const ownerName = (form: Form) => (context.type === 'personal' ? user?.name : form.owner?.name);
  const toggleSort = (key: string) =>
    setSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'title' || key === 'status' ? 'asc' : 'desc' }));

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openOrSelect = (form: Form) => {
    if (selecting) {
      toggleSelected(form._id);
      return;
    }
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => router.push(formHref(`/forms/${form._id}/overview`, context)), 220);
  };

  return {
    router, view, setView,
    isModalOpen, setIsModalOpen,
    formToMove, setFormToMove, formToShare, setFormToShare,
    formToDelete, setFormToDelete, formToTemplate, setFormToTemplate,
    search, setSearch, status, sort, setSort, pageSize, setPageSize, page, setPage,
    activeTab, selectedIds, setSelectedIds, selecting, openTimer,
    bulkDeleteConfirming, setBulkDeleteConfirming,
    canDelete, canArchive, canMakeTemplate, canCreate, onArchivedTab, onPinnedTab,
    pinMutation, handleTabChange,
    data, isLoading, error, refetch,
    allCount, tabCounts, headerFacts, isFirstRun,
    duplicatingId, deletingId, archivingId,
    duplicateMutation, deleteMutation, archiveMutation, bulkDeleteMutation,
    rows, maxResponses, allOnPageSelected, someOnPageSelected,
    ownerName, toggleSort, toggleSelected, openOrSelect,
  };
}
