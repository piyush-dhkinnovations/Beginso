'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, FolderSymlink, LayoutDashboard, Share2, PinOff, Archive } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspaceKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
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
  const debouncedSearch = useDebounce(search, 300);

  const handleTabChange = (tab: FormsManagerTab) => {
    setActiveTab(tab);
    setPage(1);
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

  const columns: TableColumn<Form>[] = [
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
              <Link href={`/forms/${form._id}/overview`} className="bg-body font-semibold truncate hover:underline">
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
            onSelect: () => router.push(`/forms/${formId}/overview`),
          },
          {
            id: 'responses',
            label: 'View Responses',
            icon: <Table2 className="bg-icon" />,
            onSelect: () => router.push(`/forms/${formId}/responses`),
          },
          {
            id: 'analytics',
            label: 'View Analytics',
            icon: <BarChart2 className="bg-icon" />,
            onSelect: () => router.push(`/forms/${formId}/analytics`),
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
          {
            id: 'delete',
            label: deletingId === formId ? 'Deleting…' : 'Delete',
            icon: <Trash2 className="bg-icon" />,
            disabled: deletingId === formId,
            danger: true,
            onSelect: () => setFormToDelete(form),
          },
        ];

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={`/forms/${formId}/edit`}
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

      <FormsManagerTabs activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === 'pinned' || activeTab === 'archived' ? (
        <EmptyState
          icon={activeTab === 'pinned' ? <PinOff /> : <Archive />}
          heading="Coming soon"
          body={
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

          {error ? (
            <Alert variant="error" title="Failed to load forms. Please refresh." />
          ) : (
            <Table
              columns={columns}
              rows={data?.forms ?? []}
              rowKey={(form) => form._id}
              isLoading={isLoading}
              emptyState={
                <EmptyState
                  icon={<FileText />}
                  heading={search || status !== 'all' ? 'No matching forms' : 'No forms yet'}
                  body={search || status !== 'all' ? 'Try changing your search or status filter.' : 'Create your first form to get started collecting responses.'}
                  action={
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
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
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
    </div>
  );
}
