'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, FolderSymlink, LayoutDashboard, LayoutTemplate, Share2, Pin, PinOff, Archive, ArchiveRestore, Search } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canDeleteForm, canArchiveForm, canPublishTemplate } from '@/lib/roles';
import { PublishTemplateModal } from '@/components/templates/PublishTemplateModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
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
import { PaginationControls } from '@/components/responses/PaginationControls';
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

type SortKey = 'updated' | 'oldest' | 'name' | 'responses';

// ponytail: sorting is applied to the loaded page only — the forms API takes no sort parameter yet.
// With the page-size selector (10/25/50) that is exact for most accounts; add a server-side `sort`
// query param if lists routinely span several pages.
function sortForms(forms: Form[], sort: SortKey): Form[] {
  const list = [...forms];
  switch (sort) {
    case 'oldest': return list.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    case 'name': return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'responses': return list.sort((a, b) => b.responseCount - a.responseCount);
    default: return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
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
  const [sort, setSort] = useState<SortKey>('updated');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FormsManagerTab>('recent');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: workspaceKeys.forms(
      context,
      { search: debouncedSearch, status, page, limit: pageSize, archived: onArchivedTab ? 'only' : undefined, pinned: onPinnedTab ? true : undefined }
    ),
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

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      if (data?.forms.length === 1 && page > 1) setPage((current) => current - 1);
      // Delete means Trash since Sprint 13 (CF5.5): reversible, so say where it went and how to get it back.
      toast('Moved to Trash — you can restore it for 30 days', 'success', undefined, {
        label: 'View Trash',
        onClick: () => router.push(context.type === 'workspace' ? `/w/${context.workspaceId}/trash` : '/trash'),
      });
    },
    onError: () => {
      toast('Failed to delete form. Please try again.', 'error');
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
    onError: () => toast('Could not update the form. Please try again.', 'error'),
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
      toast(`${ids.length} form${ids.length === 1 ? '' : 's'} moved to Trash`, 'success', undefined, {
        label: 'View Trash',
        onClick: () => router.push(context.type === 'workspace' ? `/w/${context.workspaceId}/trash` : '/trash'),
      });
    },
    onError: () => {
      toast('Failed to delete the selected forms. Please try again.', 'error');
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
  const ownerOf = (form: Form) =>
    context.type === 'personal'
      ? { name: user?.name, email: user?.email, avatarUrl: undefined as string | undefined }
      : { name: form.owner?.name, email: undefined as string | undefined, avatarUrl: form.owner?.avatarUrl };

  const buildMenuItems = (form: Form): MenuItem[] => {
    const formId = form._id;
    return [
      {
        id: 'overview',
        label: 'Overview',
        icon: <LayoutDashboard className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/overview`, context)),
      },
      {
        id: 'responses',
        label: 'View Responses',
        icon: <Table2 className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/responses`, context)),
      },
      {
        id: 'analytics',
        label: 'View Analytics',
        icon: <BarChart2 className="bg-icon" />,
        onSelect: () => router.push(formHref(`/forms/${formId}/analytics`, context)),
      },
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
    <Menu trigger={<MoreVertical className="bg-icon" />} triggerLabel="More Options" items={buildMenuItems(form)} align="end" />
  );

  const columns: TableColumn<Form>[] = [
    ...(canDelete ? [{
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
      render: (form) => (
        <div className="flex min-w-0 items-center gap-3">
          <FormTile title={form.title} />
          <div className="flex min-w-0 flex-col">
            <Link href={formHref(`/forms/${form._id}/overview`, context)} className="bg-body-sm font-semibold truncate text-(--text-primary) hover:underline">
              {form.title}
            </Link>
            <span className="bg-caption truncate text-(--text-muted)">{form.description || 'No description'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (form) => {
        const owner = ownerOf(form);
        return (
          <div className="flex items-center gap-3">
            <Avatar name={owner.name} src={owner.avatarUrl} size="sm" aria-label={owner.name ? `Owned by ${owner.name}` : undefined} />
            <div className="min-w-0">
              {owner.name && <span className="block bg-body-sm font-semibold text-(--text-primary)">{owner.name}</span>}
              {owner.email && <span className="block truncate bg-caption text-(--text-muted)">{owner.email}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (form) => <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>,
    },
    {
      key: 'responses',
      header: 'Responses',
      render: (form) => <span className="bg-body-sm tabular-nums text-(--text-primary)">{form.responseCount}</span>,
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (form) => <span className="bg-body-sm text-(--text-secondary)">{formatUpdated(form.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (form) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={formHref(`/forms/${form._id}/edit`, context)}
            className="bg-btn bg-btn-ghost bg-btn-icon"
            title="Edit Form"
            aria-label="Edit Form"
          >
            <Edit2 className="bg-icon" />
          </Link>
          {pinButton(form)}
          {rowMenu(form)}
        </div>
      ),
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
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-2" />
            Create Form
          </Button>
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

  const emptyFiltered = emptyPinned ?? emptyArchived ?? (
    <EmptyState
      illustration={search || status !== 'all' ? 'no-results' : 'empty-forms'}
      icon={<FileText />}
      title={search || status !== 'all' ? 'No matching forms' : 'No forms yet'}
      description={search || status !== 'all' ? 'Try changing your search or status filter.' : 'Create your first form to get started collecting responses.'}
      actions={
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Form
        </Button>
      }
    />
  );

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Forms"
        description="Build, manage, and publish your forms."
        actionsAlign="center"
        actions={
          <>
            <Link href="/templates" className="bg-btn bg-btn-secondary">
              <LayoutTemplate size={16} className="mr-2" aria-hidden="true" />
              Templates
            </Link>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              aria-label="Create new form"
            >
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
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
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Create Form
            </Button>
          }
        />
      ) : (
        <>
          <FormsManagerTabs activeTab={activeTab} onChange={handleTabChange} />

          {(
            <>
              <div className="flex flex-wrap items-center gap-3">
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
                {activeTab === 'recent' && (
                  <div className="sm:w-44">
                    <Select
                      id="forms-status-filter"
                      aria-label="Filter forms by status"
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value as FormStatus | 'all');
                        setPage(1);
                        setSelectedIds(new Set());
                      }}
                    >
                      <option value="all">All statuses</option>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="closed">Closed</option>
                    </Select>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <FormsViewToggle value={view} onChange={setView} />
                  {!onPinnedTab && <div className="w-44">
                    <Select id="forms-sort" aria-label="Sort forms" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                      <option value="updated">Latest updated</option>
                      <option value="oldest">Oldest updated</option>
                      <option value="name">Name (A–Z)</option>
                      <option value="responses">Most responses</option>
                    </Select>
                  </div>}
                </div>
              </div>

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
                  onRowDoubleClick={canDelete ? (form) => setSelectedIds((prev) => new Set(prev).add(form._id)) : undefined}
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="bg-caption text-(--text-muted)">
                    {data.total} form{data.total !== 1 ? 's' : ''} total
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
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
                    <PaginationControls
                      page={page}
                      totalPages={totalPages}
                      onPageChange={(p) => {
                        setPage(p);
                        setSelectedIds(new Set());
                      }}
                    />
                  </div>
                </div>
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
