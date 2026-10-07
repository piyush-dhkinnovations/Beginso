'use client';

import { keepPreviousInScope } from '@/lib/queryOptions';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, CheckSquare, FolderSymlink, LayoutDashboard, LayoutTemplate, Share2, Pin, PinOff, Archive, ArchiveRestore, Search } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';
import { Toolbar } from '@/components/ui/Toolbar';
import { ListFooter } from '@/components/ui/ListFooter';
import { OwnerMonogram } from '@/components/forms/OwnerMonogram';
import { formsService } from '@/services/forms';
import { trashService } from '@/services/trash';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canDeleteForm, canArchiveForm, canPublishTemplate, canCreateForm } from '@/lib/roles';
import { PublishTemplateModal } from '@/components/templates/PublishTemplateModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Table, type TableColumn, type TableSort } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { BulkActionBar } from '@/components/forms/BulkActionBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreateFormModal } from '@/components/form-builder/CreateFormModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { MoveFormModal } from '@/components/workspaces/MoveFormModal';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { PinButton } from '@/components/forms/PinButton';
import { usePinForm } from '@/hooks/usePinForm';
import { FormsManagerTabs, type FormsManagerTab } from '@/components/forms/FormsManagerTabs';
import { FormsViewToggle } from '@/components/forms/FormsViewToggle';
import { FormTile } from '@/components/forms/FormTile';
import { FormCard } from '@/components/forms/FormCard';
import { useFormsView } from '@/hooks/useFormsView';
import { useDebounce } from '@/hooks/useDebounce';
import type { Form, FormStatus } from '@/types/form';
import type { FormsContext } from '@/types/workspace';


// ─── Status badge variant helper ─────────────────────────────────────────────

const STATUS_VARIANT: Record<FormStatus, 'draft' | 'published' | 'closed'> = {
  draft: 'draft',
  published: 'published',
  closed: 'closed',
};

const STATUS_LABEL: Record<FormStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
};

const PAGE_SIZES = [10, 25, 50] as const;


// ponytail: sorting is applied to the loaded page only — the forms API (GET /api/forms) takes no sort
// parameter and always returns createdAt-desc. With the page-size selector (10/25/50) that is exact for
// most accounts; add a server-side `sort` query param if lists routinely span several pages.
function sortForms(forms: Form[], { key, dir }: TableSort): Form[] {
  const sign = dir === 'asc' ? 1 : -1;
  const cmp: Record<string, (a: Form, b: Form) => number> = {
    title: (a, b) => a.title.localeCompare(b.title),
    status: (a, b) => a.status.localeCompare(b.status),
    responses: (a, b) => a.responseCount - b.responseCount,
    updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  };
  return [...forms].sort((a, b) => sign * (cmp[key] ?? cmp.updated)(a, b));
}

// "26 Sep 2026, 12:30" — day-first, three-letter month, 24-hour. Built from parts because the en-GB
// locale spells September "Sept".
const formatUpdated = (iso: string) => {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${d.getDate()} ${month} ${d.getFullYear()}, ${time}`;
};

// Tabs backed by the forms list query (requirements.md §7.10). Pinned adds `pinned=true` (per-user).
const TAB_STATUS: Partial<Record<FormsManagerTab, FormStatus | 'all'>> = {
  recent: 'all',
  pinned: 'all',
  draft: 'draft',
  published: 'published',
  closed: 'closed',
  // Sprint 13 (CF5.6): Archived is a real list now (`?archived=only`); every status shows there.
  archived: 'all',
};

function formsQueryEnabled(tab: FormsManagerTab): boolean {
  return tab in TAB_STATUS;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface FormsPageProps {
  context?: FormsContext;
}

// Every link this page builds into a form's own detail routes (edit/overview/responses/
// analytics) carries this hint when reached from a workspace context — PersonalShell reads it
// to paint the correct sidebar/context immediately on the next page, instead of flashing
// Personal while it re-fetches the form to figure out its workspace from scratch (real bug this
// fixes: crossing from /w/[slug]/forms into /forms/:id/edit unmounts WorkspaceShell entirely,
// so the next shell starts knowing nothing).
function formHref(path: string, context: FormsContext): string {
  return context.type === 'workspace' ? `${path}?ws=${context.workspaceId}` : path;
}

export default function FormsPage({ context = { type: 'personal' } }: FormsPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [view, setView] = useFormsView();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formToMove, setFormToMove] = useState<Form | null>(null);
  const [formToShare, setFormToShare] = useState<Form | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [formToTemplate, setFormToTemplate] = useState<Form | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
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

  // Chip/header counts. When the unfiltered list is fully on screen (every form fits one page) they are counted
  // from it directly — no extra requests. Otherwise one `limit=1` request per bucket reads only `total`.
  // Closed is derived (all − published − draft), which is exact because the default list excludes archived forms.
  // The API sorts by created date, so "last edited" is only honest when every form is loaded.
  const loadedAll = activeTab === 'recent' && !debouncedSearch && !!data && data.total <= data.forms.length;
  const useCountOf = (params: { status?: string; archived?: 'only' }) =>
    useQuery({
      queryKey: workspaceKeys.forms(context, { ...params, page: 1, limit: 1 }),
      queryFn: () => formsService.getForms({ ...params, page: 1, limit: 1 }, context),
      select: (r) => r.total,
      enabled: !!data && !loadedAll,
      staleTime: 30_000,
    });
  const { data: queriedAll } = useCountOf({});
  const { data: queriedPublished } = useCountOf({ status: 'published' });
  const { data: queriedDraft } = useCountOf({ status: 'draft' });
  const { data: archivedCount } = useCountOf({ archived: 'only' });
  const allCount = loadedAll ? data.total : queriedAll;
  const publishedCount = loadedAll ? data.forms.filter((f) => f.status === 'published').length : queriedPublished;
  const draftCount = loadedAll ? data.forms.filter((f) => f.status === 'draft').length : queriedDraft;
  const closedCount =
    allCount !== undefined && publishedCount !== undefined && draftCount !== undefined ? Math.max(0, allCount - publishedCount - draftCount) : undefined;
  const tabCounts = { recent: allCount, published: publishedCount, draft: draftCount, closed: closedCount, archived: archivedCount };
  const lastEdited = loadedAll && data.total > 0 ? data.forms.reduce((m, f) => (f.updatedAt > m ? f.updatedAt : m), '') : '';
  const headerFacts =
    allCount === undefined
      ? undefined
      : allCount === 0
        ? '0 forms'
        : [
            `${allCount} form${allCount === 1 ? '' : 's'}`,
            publishedCount !== undefined && `${publishedCount} live`,
            draftCount !== undefined && `${draftCount} draft${draftCount === 1 ? '' : 's'}`,
            lastEdited && `last edited ${formatRelativeTime(lastEdited)}`,
          ]
            .filter(Boolean)
            .join(' · ');

  // First run: nothing exists yet and nothing is filtered. Tabs, search, the status filter and the
  // table header would all be controls over zero rows, so only the empty state is shown.
  const isFirstRun =
    activeTab === 'recent' && status === 'all' && !search && !error && !isLoading && !!data && data.forms.length === 0;

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => formsService.duplicateForm(id),
    onMutate: (id) => setDuplicatingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast('Form duplicated successfully', 'success');
    },
    onError: () => {
      toast('Failed to duplicate form. Please try again.', 'error');
    },
    onSettled: () => setDuplicatingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formsService.deleteForm(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: (_d, id) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      if (data?.forms.length === 1 && page > 1) setPage((current) => current - 1);
      // Delete means Trash since Sprint 13 (CF5.5): reversible, so name the form and offer Undo.
      const title = data?.forms.find((f) => f._id === id)?.title ?? 'Form';
      const scope = context.type === 'workspace' ? context.workspaceId : 'personal';
      toast(`"${title}" moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          trashService
            .restore(scope, 'form', id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`"${title}" restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: `restore "${title}"` }), 'error'));
        },
      });
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete this form' }), 'error');
    },
    onSettled: () => setDeletingId(null),
  });

  // Archive / Unarchive (Sprint 13, CF5.6). Archive keeps the form and its responses indefinitely and takes it
  // out of the active list; the same call serves the row action and the bulk bar (sequential, like delete).
  const archiveMutation = useMutation({
    mutationFn: async ({ ids, archive }: { ids: string[]; archive: boolean }) => {
      for (const id of ids) {
        await (archive ? formsService.archiveForm(id) : formsService.unarchiveForm(id));
      }
    },
    onMutate: ({ ids }) => setArchivingId(ids.length === 1 ? ids[0] : '*'),
    onSuccess: (_d, { ids, archive }) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setSelectedIds(new Set());
      const n = ids.length;
      toast(`${n} form${n === 1 ? '' : 's'} ${archive ? 'archived' : 'unarchived'}`, 'success', undefined, {
        label: 'Undo',
        onClick: () => archiveMutation.mutate({ ids, archive: !archive }),
      });
    },
    onError: (err, { archive }) => toast(getFriendlyErrorMessage(err, { action: archive ? 'archive this form' : 'unarchive this form', fallback: 'Could not update the form. Please try again.' }), 'error'),
    onSettled: () => setArchivingId(null),
  });

  const bulkDeleteMutation = useMutation({
    // Sequential per-id calls, not Promise.all — task 6.4's own stated reasoning: acceptable at
    // this sprint's expected list sizes, no batching infrastructure to build speculatively.
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await formsService.deleteForm(id);
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      setSelectedIds(new Set());
      const scope = context.type === 'workspace' ? context.workspaceId : 'personal';
      toast(`${ids.length} form${ids.length === 1 ? '' : 's'} moved to Trash`, 'success', undefined, {
        label: 'Undo',
        onClick: () => {
          Promise.all(ids.map((id) => trashService.restore(scope, 'form', id)))
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['forms'] });
              queryClient.invalidateQueries({ queryKey: ['trash'] });
              toast(`${ids.length} form${ids.length === 1 ? '' : 's'} restored`, 'success');
            })
            .catch((err) => toast(getFriendlyErrorMessage(err, { action: 'restore these forms' }), 'error'));
        },
      });
    },
    onError: (err) => {
      toast(getFriendlyErrorMessage(err, { action: 'delete the selected forms' }), 'error');
    },
    onSettled: () => setBulkDeleteConfirming(false),
  });

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

  const buildMenuItems = (form: Form): MenuItem[] => {
    const formId = form._id;
    return [
      {
        id: 'edit',
        label: 'Edit form',
        icon: <Edit2 className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/edit`, context)),
      },
      {
        id: 'overview',
        label: 'Overview',
        icon: <LayoutDashboard className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/overview`, context)),
      },
      {
        id: 'responses',
        label: 'Open Inbox',
        icon: <Table2 className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/inbox`, context)),
      },
      {
        id: 'analytics',
        label: 'Open Insights',
        icon: <BarChart2 className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/insights`, context)),
      },
      ...(canDelete && !selecting ? [{
        id: 'select',
        label: 'Select',
        icon: <CheckSquare className="bg-icon" />,
        onSelect: () => toggleSelected(formId),
      }] : []),
      ...(onArchivedTab ? [] : [{
        id: 'pin',
        label: form.pinned ? 'Unpin' : 'Pin to top',
        icon: form.pinned ? <PinOff className="bg-icon" /> : <Pin className="bg-icon" />,
        onSelect: () => pinMutation.mutate({ id: formId, pin: !form.pinned }),
      }]),
      {
        id: 'move',
        label: 'Move',
        icon: <FolderSymlink className="bg-icon" />,
        onSelect: () => setFormToMove(form),
      },
      {
        id: 'share',
        label: 'Share access',
        icon: <Share2 className="bg-icon" />,
        onSelect: () => setFormToShare(form),
      },
      {
        id: 'duplicate',
        label: duplicatingId === formId ? 'Duplicating…' : 'Duplicate',
        icon: <Copy className="bg-icon" />,
        disabled: duplicatingId === formId,
        onSelect: () => duplicateMutation.mutate(formId),
      },
      ...(canArchive
        ? [{
            id: 'archive',
            label: archivingId === formId ? 'Updating…' : onArchivedTab ? 'Unarchive' : 'Archive',
            icon: onArchivedTab ? <ArchiveRestore className="bg-icon" /> : <Archive className="bg-icon" />,
            disabled: archivingId === formId,
            onSelect: () => archiveMutation.mutate({ ids: [formId], archive: !onArchivedTab }),
          }]
        : []),
      ...(canMakeTemplate
        ? [{
            id: 'publish-template',
            label: 'Publish to templates',
            icon: <LayoutTemplate className="bg-icon" />,
            onSelect: () => setFormToTemplate(form),
          }]
        : []),
      ...(canDelete
        ? [{
            id: 'delete',
            label: deletingId === formId ? 'Moving to Trash…' : 'Delete',
            icon: <Trash2 className="bg-icon" />,
            disabled: deletingId === formId,
            danger: true,
            onSelect: () => setFormToDelete(form),
          }]
        : []),
    ];
  };

  // Archived forms cannot be pinned (backend 409), so no pin affordance on that tab.
  const pinButton = (form: Form) => onArchivedTab ? null : (
    <PinButton title={form.title} pinned={!!form.pinned} onToggle={() => pinMutation.mutate({ id: form._id, pin: !form.pinned })} />
  );

  const rowMenu = (form: Form) => (
    <Menu trigger={<MoreVertical className="bg-icon" />} triggerLabel={`Actions for ${form.title}`} items={buildMenuItems(form)} align="end" />
  );

  const columns: TableColumn<Form>[] = [
    ...(canDelete && selecting ? [{
      key: 'select',
      className: 'w-10',
      header: (
        <Checkbox
          id="forms-select-all"
          aria-label={allOnPageSelected ? 'Deselect all forms on this page' : 'Select all forms on this page'}
          checked={allOnPageSelected}
          ref={(el) => {
            if (el) el.indeterminate = someOnPageSelected;
          }}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              rows.forEach((form) => (checked ? next.add(form._id) : next.delete(form._id)));
              return next;
            });
          }}
        />
      ),
      render: (form: Form) => (
        <Checkbox
          id={`forms-select-${form._id}`}
          aria-label={`Select ${form.title}`}
          checked={selectedIds.has(form._id)}
          onChange={(e) => {
            const checked = e.target.checked;
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(form._id);
              else next.delete(form._id);
              return next;
            });
          }}
        />
      ),
    }] : []),
    {
      key: 'form',
      header: 'Form Title',
      sortKey: 'title',
      render: (form) => {
        const owner = ownerName(form);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <FormTile title={form.title} size={32} />
            <div className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={formHref(`/forms/${form._id}/overview`, context)}
                  className="bg-body-sm font-semibold truncate text-(--text-primary) hover:underline"
                  onClick={canDelete ? (e) => {
                    // Plain clicks go through the same open-or-select path as the row, so a double-click on the title can start selection.
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    openOrSelect(form);
                  } : undefined}
                >
                  {form.title}
                </Link>
                {form.pinned && (
                  <>
                    <Pin size={12} className="flex-none fill-current text-(--action-primary)" aria-hidden="true" />
                    <span className="sr-only">Pinned</span>
                  </>
                )}
              </span>
              <span className="bg-caption truncate text-(--text-muted)">
                {owner ? `${owner} · ` : ''}created {formatRelativeTime(form.createdAt)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (form) => <OwnerMonogram name={ownerName(form)} brandColor={form.branding?.primaryColor} title={form.title} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (form) => <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>,
    },
    {
      key: 'responses',
      header: 'Responses',
      sortKey: 'responses',
      render: (form) => <span className="bg-body-sm tabular-nums text-(--text-primary)">{form.responseCount}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      sortKey: 'updated',
      render: (form) => <span className="bg-body-sm text-(--text-secondary)">{formatUpdated(form.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (form) => rowMenu(form),
    },
  ];

  // Zero archived forms vs no matches are different screens (wireframe state rule). Archived forms are never
  // "first run": the empty copy explains what Archive is for and points back to the active list.
  const emptyArchived =
    onArchivedTab && !search ? (
      <EmptyState
        icon={<Archive />}
        title="No archived forms"
        description="Archive a finished form to keep it and its responses without cluttering your list."
        primaryAction={
          <Button variant="primary" onClick={() => handleTabChange('recent')}>
            Go to Forms
          </Button>
        }
        secondaryAction={
          canCreate ? (
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          ) : undefined
        }
      />
    ) : null;

  const emptyPinned = onPinnedTab ? (
    search ? (
      <EmptyState illustration="no-results" icon={<Search />} title="No matching pinned forms" description="Try changing your search." />
    ) : (
      <EmptyState
        illustration="empty-forms"
        icon={<Pin />}
        title="No pinned forms yet"
        description="Pin the forms you open most so they are always one click away."
        primaryAction={
          <Button variant="primary" onClick={() => handleTabChange('recent')}>
            Go to Recent
          </Button>
        }
      />
    )
  ) : null;

  // A filtered-empty state names the filter and the size of what is hidden, and offers to clear it.
  const filterName = search ? `"${search}"` : status !== 'all' ? STATUS_LABEL[status].toLowerCase() : '';
  const clearFilters = () => {
    setSearch('');
    handleTabChange('recent');
  };
  const hiddenElsewhere = allCount && allCount > 0 ? allCount : 0;
  const emptyFiltered = emptyPinned ?? emptyArchived ?? (
    filterName ? (
      <EmptyState
        illustration="no-results"
        icon={<FileText />}
        title={search ? `No forms match ${filterName}` : `No ${filterName} forms`}
        description={hiddenElsewhere ? `There ${hiddenElsewhere === 1 ? 'is 1 other form' : `are ${hiddenElsewhere} other forms`}.` : undefined}
        actions={<Button variant="secondary" onClick={clearFilters}>Clear filter</Button>}
      />
    ) : (
      <EmptyState
        illustration="empty-forms"
        icon={<FileText />}
        title="No forms yet"
        description="Create your first form to get started collecting responses."
        actions={
          canCreate ? (
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          ) : undefined
        }
      />
    )
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Forms"
        description={headerFacts}
        actionsAlign="center"
        actions={
          <>
            <Link href="/templates" className="bg-btn bg-btn-secondary">
              <LayoutTemplate size={16} className="mr-2" aria-hidden="true" />
              Templates
            </Link>
            {canCreate && (
              <Button
                variant="primary"
                onClick={() => setIsModalOpen(true)}
                aria-label="Create new form"
              >
                <Plus size={16} className="mr-2" />
                Create Form
              </Button>
            )}
          </>
        }
      />

      {isFirstRun ? (
        <EmptyState
          illustration="empty-forms"
          icon={<FileText />}
          title="No forms yet"
          description="Create your first form to get started collecting responses."
          actions={
            canCreate ? (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} className="mr-2" />
                Create Form
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <FormsManagerTabs activeTab={activeTab} onChange={handleTabChange} counts={tabCounts} />

          {(
            <>
              <Toolbar>
                <div className="w-full sm:max-w-sm">
                  <Input
                    id="forms-search"
                    aria-label="Search forms"
                    placeholder="Search forms…"
                    leftIcon={<Search className="bg-icon" />}
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                      setSelectedIds(new Set());
                    }}
                  />
                </div>
                <div className="ml-auto flex items-center gap-3">
                  {view === 'grid' && !onPinnedTab && (
                    <div className="w-44">
                      <Select
                        id="forms-sort"
                        aria-label="Sort forms"
                        value={`${sort.key}:${sort.dir}`}
                        onChange={(event) => {
                          const [key, dir] = event.target.value.split(':');
                          setSort({ key, dir: dir as TableSort['dir'] });
                        }}
                      >
                        <option value="updated:desc">Latest updated</option>
                        <option value="updated:asc">Oldest updated</option>
                        <option value="title:asc">Name (A–Z)</option>
                        <option value="responses:desc">Most responses</option>
                      </Select>
                    </div>
                  )}
                  <FormsViewToggle value={view} onChange={setView} />
                </div>
              </Toolbar>

              {canDelete && view === 'list' && (
                <BulkActionBar
                  count={selectedIds.size}
                  isDeleting={bulkDeleteMutation.isPending}
                  onDeleteSelected={() => setBulkDeleteConfirming(true)}
                  onArchiveSelected={
                    canArchive
                      ? () => archiveMutation.mutate({ ids: [...selectedIds], archive: !onArchivedTab })
                      : undefined
                  }
                  isArchiving={archiveMutation.isPending}
                  archiveLabel={onArchivedTab ? 'Unarchive' : 'Archive'}
                />
              )}

              {error ? (
                <Alert variant="error" title="Failed to load forms.">
                  <Button variant="secondary" size="small" className="mt-2" onClick={() => refetch()}>Retry</Button>
                </Alert>
              ) : view === 'list' ? (
                <Table
                  columns={columns}
                  rows={rows}
                  rowKey={(form) => form._id}
                  isLoading={isLoading}
                  dense
                  sort={onPinnedTab ? undefined : sort}
                  onSortChange={onPinnedTab ? undefined : toggleSort}
                  onRowClick={openOrSelect}
                  onRowDoubleClick={canDelete ? (form) => {
                    if (openTimer.current) clearTimeout(openTimer.current);
                    toggleSelected(form._id);
                  } : undefined}
                  emptyState={emptyFiltered}
                />
              ) : isLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-44 animate-pulse rounded-lg border border-(--border-default) bg-(--bg-sunken)" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                emptyFiltered
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((form) => (
                    <FormCard
                      key={form._id}
                      form={form}
                      href={formHref(`/forms/${form._id}/overview`, context)}
                      menu={<>{pinButton(form)}{rowMenu(form)}</>}
                      maxResponses={maxResponses}
                    />
                  ))}
                </div>
              )}

              {!isLoading && !error && data && (
                <ListFooter
                  page={page}
                  pageSize={pageSize}
                  total={data.total}
                  noun="form"
                  onPageChange={(p) => {
                    setPage(p);
                    setSelectedIds(new Set());
                  }}
                >
                  <div className="flex items-center gap-2">
                    <label htmlFor="forms-page-size" className="bg-body-sm text-(--text-muted)">Rows per page</label>
                    <div className="w-20">
                      <Select
                        id="forms-page-size"
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                          setPage(1);
                          setSelectedIds(new Set());
                        }}
                      >
                        {PAGE_SIZES.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </ListFooter>
              )}
            </>
          )}
        </>
      )}

      <CreateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDestination={context}
      />

      <MoveFormModal
        isOpen={formToMove !== null}
        formId={formToMove?._id ?? ''}
        formTitle={formToMove?.title ?? ''}
        currentContext={context}
        onClose={() => setFormToMove(null)}
      />

      {/* requirements.md §7.8 — works identically on a personal or workspace form; this same
          FormsPage/FormRow is already shared between (user)/forms and /w/[slug]/forms (Sprint 8),
          so no per-context branching is needed here (design.md §4). */}
      <FormAccessPanel
        isOpen={formToShare !== null}
        formId={formToShare?._id ?? ''}
        formTitle={formToShare?.title ?? ''}
        onClose={() => setFormToShare(null)}
      />

      <DeleteFormModal
        isOpen={formToDelete !== null}
        formTitle={formToDelete?.title ?? ''}
        responseCount={formToDelete?.responseCount}
        onClose={() => setFormToDelete(null)}
        onConfirm={() => {
          if (formToDelete) {
            deleteMutation.mutate(formToDelete._id);
            setFormToDelete(null);
          }
        }}
        isDeleting={deletingId !== null}
      />

      <PublishTemplateModal
        isOpen={formToTemplate !== null}
        onClose={() => setFormToTemplate(null)}
        scope={context.type === 'workspace' ? context.workspaceId : ''}
        formId={formToTemplate?._id ?? ''}
        formTitle={formToTemplate?.title ?? ''}
      />

      <DeleteFormModal
        isOpen={bulkDeleteConfirming}
        count={selectedIds.size}
        onClose={() => setBulkDeleteConfirming(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...selectedIds])}
        isDeleting={bulkDeleteMutation.isPending}
      />
    </div>
  );
}
