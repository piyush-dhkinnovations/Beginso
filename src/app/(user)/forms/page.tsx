'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, FolderSymlink, LayoutDashboard, Share2, PinOff, Archive } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canDeleteForm } from '@/lib/roles';
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
import { FormsManagerTabs, type FormsManagerTab } from '@/components/forms/FormsManagerTabs';
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

const FORMS_PAGE_LIMIT = 10;

// Tabs backed by the existing status filter (requirements.md §7.10) — Pinned/Archived have no
// backing data yet (design.md §23) and fire no forms query at all.
const TAB_STATUS: Partial<Record<FormsManagerTab, FormStatus | 'all'>> = {
  recent: 'all',
  draft: 'draft',
  published: 'published',
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formToMove, setFormToMove] = useState<Form | null>(null);
  const [formToShare, setFormToShare] = useState<Form | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FormStatus | 'all'>('all');
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

  const { data, isLoading, error } = useQuery({
    queryKey: workspaceKeys.forms(
      context,
      { search: debouncedSearch, status, page, limit: FORMS_PAGE_LIMIT }
    ),
    queryFn: () =>
      formsService.getForms(
        {
          search: debouncedSearch || undefined,
          status: status === 'all' ? undefined : status,
          page,
          limit: FORMS_PAGE_LIMIT,
        },
        context
      ),
    enabled: formsQueryEnabled(activeTab),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / FORMS_PAGE_LIMIT));

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
      if (data?.forms.length === 1 && page > 1) setPage((current) => current - 1);
      toast('Form deleted successfully', 'success');
    },
    onError: () => {
      toast('Failed to delete form. Please try again.', 'error');
    },
    onSettled: () => setDeletingId(null),
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
      setSelectedIds(new Set());
      toast(`${ids.length} form${ids.length === 1 ? '' : 's'} deleted`, 'success');
    },
    onError: () => {
      toast('Failed to delete the selected forms. Please try again.', 'error');
    },
    onSettled: () => setBulkDeleteConfirming(false),
  });

  const rows = data?.forms ?? [];
  const allOnPageSelected = rows.length > 0 && rows.every((form) => selectedIds.has(form._id));
  const someOnPageSelected = rows.some((form) => selectedIds.has(form._id)) && !allOnPageSelected;

  const columns: TableColumn<Form>[] = [
    // Same pattern as the Inbox table: the column collapses to zero width (not just hidden
    // content) until something is selected — double-clicking a row is what first reveals it.
    ...(canDelete ? [{
      key: 'select',
      className: selectedIds.size > 0 ? undefined : 'undefined !p-0 overflow-hidden',
      header: selectedIds.size > 0 ? (
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
      ) : null,
      render: (form: Form) => selectedIds.size > 0 ? (
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
      ) : null,
    }] : []),
    {
      key: 'form',
      header: 'Form Title',
      render: (form) => {
        const updatedAt = new Date(form.updatedAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-subtle)' }}
            >
              <FileText size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="flex flex-col min-w-0">
              <Link href={formHref(`/forms/${form._id}/overview`, context)} className="bg-body font-semibold truncate hover:underline">
                {form.title}
              </Link>
              <span className="bg-caption mt-0.5">
                Updated {updatedAt} · {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (form) =>
        context.type === 'personal' ? (
          // A personal form has exactly one possible owner: the caller (requirements.md §7.9).
          <Avatar name={user?.name} size="sm" aria-label={user?.name ? `Owned by ${user.name}` : undefined} />
        ) : (
          // Backend contract to confirm — GET /api/forms does not yet document owner identity
          // for a workspace-form row (form.ts's `owner` field, added optional this sprint).
          <Avatar name={form.owner?.name} src={form.owner?.avatarUrl} size="sm" aria-label={form.owner?.name ? `Owned by ${form.owner.name}` : undefined} />
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (form) => <StatusBadge variant={STATUS_VARIANT[form.status]}>{STATUS_LABEL[form.status]}</StatusBadge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (form) => {
        const formId = form._id;
        const menuItems: MenuItem[] = [
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
          ...(canDelete
            ? [{
                id: 'delete',
                label: deletingId === formId ? 'Deleting…' : 'Delete',
                icon: <Trash2 className="bg-icon" />,
                disabled: deletingId === formId,
                danger: true,
                onSelect: () => setFormToDelete(form),
              }]
            : []),
        ];

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={formHref(`/forms/${formId}/edit`, context)}
              className="bg-btn bg-btn-ghost bg-btn-icon"
              title="Edit Form"
              aria-label="Edit Form"
            >
              <Edit2 className="bg-icon" />
            </Link>
            <Menu trigger={<MoreVertical className="bg-icon" />} triggerLabel="More Options" items={menuItems} align="end" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <PageHeader
        title="Forms"
        description="Build, manage, and publish your forms."
        actions={
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            aria-label="Create new form"
          >
            <Plus size={16} className="mr-2" />
            Create Form
          </Button>
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

      {activeTab === 'pinned' || activeTab === 'archived' ? (
        <EmptyState
          icon={activeTab === 'pinned' ? <PinOff /> : <Archive />}
          title="Coming soon"
          description={
            activeTab === 'pinned'
              ? 'Pinning forms is not available yet.'
              : 'Archived forms will show up here once archiving ships.'
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-sm">
              <Input
                id="forms-search"
                aria-label="Search forms"
                placeholder="Search forms…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
              />
            </div>
            {activeTab === 'recent' && (
              <div className="sm:w-48">
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
          </div>

          {canDelete && (
            <BulkActionBar
              count={selectedIds.size}
              isDeleting={bulkDeleteMutation.isPending}
              onDeleteSelected={() => setBulkDeleteConfirming(true)}
            />
          )}

          {error ? (
            <Alert variant="error" title="Failed to load forms. Please refresh." />
          ) : (
            <Table
              columns={columns}
              rows={data?.forms ?? []}
              rowKey={(form) => form._id}
              isLoading={isLoading}
              onRowDoubleClick={canDelete ? (form) => setSelectedIds((prev) => new Set(prev).add(form._id)) : undefined}
              emptyState={
                <EmptyState illustration={search || status !== 'all' ? 'no-results' : 'empty-forms'}
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
              }
            />
          )}

          {!isLoading && !error && data && data.forms.length > 0 && (
            <div className="bg-card px-4 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="bg-caption">
                {data.total} form{data.total !== 1 ? 's' : ''} total
              </span>
            </div>
          )}

          {!isLoading && !error && data && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                setSelectedIds(new Set());
              }}
            />
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
