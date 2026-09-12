'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, FolderSymlink } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspaceKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateFormModal } from '@/components/form-builder/CreateFormModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { MoveFormModal } from '@/components/workspaces/MoveFormModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaginationControls } from '@/components/responses/PaginationControls';
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

// ─── Row component ────────────────────────────────────────────────────────────

function FormRow({
  form,
  onDuplicate,
  isDuplicating,
  onDelete,
  isDeleting,
  onMove,
}: {
  form: Form;
  onDuplicate: (id: string) => void;
  isDuplicating: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  onMove?: (form: Form) => void;
}) {
  const router = useRouter();
  const updatedAt = new Date(form.updatedAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formId = form._id;

  const menuItems: MenuItem[] = [
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
    ...(onMove
      ? [
          {
            id: 'move',
            label: 'Move',
            icon: <FolderSymlink className="bg-icon" />,
            onSelect: () => onMove(form),
          } satisfies MenuItem,
        ]
      : []),
    {
      id: 'duplicate',
      label: isDuplicating ? 'Duplicating…' : 'Duplicate',
      icon: <Copy className="bg-icon" />,
      disabled: isDuplicating,
      onSelect: () => onDuplicate(formId),
    },
    {
      id: 'delete',
      label: isDeleting ? 'Deleting…' : 'Delete',
      icon: <Trash2 className="bg-icon" />,
      disabled: isDeleting,
      danger: true,
      onSelect: () => onDelete(formId),
    },
  ];

  return (
    <div
      className="forms-row forms-row-hoverable px-4 py-3 transition-colors group"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div
        className="[grid-area:icon] w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--bg-subtle)' }}
      >
        <FileText size={16} style={{ color: 'var(--text-muted)' }} />
      </div>

      <div className="[grid-area:title] flex flex-col min-w-0">
        <Link href={`/forms/${formId}/edit`} className="bg-body font-semibold truncate hover:underline">
          {form.title}
        </Link>
        <span className="bg-caption mt-0.5">
          Updated {updatedAt} · {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="[grid-area:badge] flex justify-start sm:justify-center">
        <StatusBadge variant={STATUS_VARIANT[form.status]}>
          {STATUS_LABEL[form.status]}
        </StatusBadge>
      </div>

      <div className="[grid-area:actions] flex items-center justify-end gap-1.5">
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
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface FormsPageProps {
  context?: FormsContext;
}

export default function FormsPage({ context = { type: 'personal' } }: FormsPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formToMove, setFormToMove] = useState<Form | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FormStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, error } = useQuery({
    queryKey: workspaceKeys.forms(
      context,
      { search: debouncedSearch, status, page, limit: FORMS_PAGE_LIMIT }
    ),
    queryFn: () => formsService.getForms({
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      page,
      limit: FORMS_PAGE_LIMIT,
    }),
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
      </div>

      {isLoading ? (
        <div className="bg-card overflow-hidden">
          {/* Table header — hidden on the stacked mobile layout, see .forms-row-header */}
          <div
            className="forms-row forms-row-header px-4 py-2.5"
            style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}
          >
            <div className="[grid-area:icon]" />
            <span className="[grid-area:title] bg-caption font-semibold uppercase tracking-wider">
              Form Title
            </span>
            <span className="[grid-area:badge] bg-caption font-semibold uppercase tracking-wider text-center">
              Status
            </span>
            <div className="[grid-area:actions]" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="forms-row px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Skeleton variant="circle" width={36} height={36} className="[grid-area:icon]" />
              <div className="[grid-area:title] flex flex-col gap-1.5 min-w-0">
                <Skeleton variant="text" width="50%" height={14} />
                <Skeleton variant="text" width="33%" height={12} />
              </div>
              <div className="[grid-area:badge] flex justify-start sm:justify-center">
                <Skeleton variant="text" width={64} height={20} />
              </div>
              <div className="[grid-area:actions] flex items-center justify-end gap-1.5">
                <Skeleton variant="circle" width={32} height={32} />
                <Skeleton variant="circle" width={32} height={32} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-body text-error">Failed to load forms. Please refresh.</p>
        </div>
      ) : !data || data.forms.length === 0 ? (
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
      ) : (
        <div className="bg-card overflow-hidden">
          {/* Table header — hidden on the stacked mobile layout, see .forms-row-header */}
          <div
            className="forms-row forms-row-header px-4 py-2.5"
            style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}
          >
            <div className="[grid-area:icon]" />
            <span className="[grid-area:title] bg-caption font-semibold uppercase tracking-wider">
              Form Title
            </span>
            <span className="[grid-area:badge] bg-caption font-semibold uppercase tracking-wider text-center">
              Status
            </span>
            <div className="[grid-area:actions]" />
          </div>

          {data.forms.map((form) => (
            <FormRow
              key={form._id}
              form={form}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              isDuplicating={duplicatingId === form._id}
              onDelete={(id) => setFormToDelete(data.forms.find((f) => f._id === id) ?? null)}
              isDeleting={deletingId === form._id}
              onMove={(f) => setFormToMove(f)}
            />
          ))}

          <div className="px-4 py-2.5" style={{ backgroundColor: 'var(--bg-subtle)', borderTop: '1px solid var(--border-subtle)' }}>
            <span className="bg-caption">
              {data.total} form{data.total !== 1 ? 's' : ''} total
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && data && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
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

