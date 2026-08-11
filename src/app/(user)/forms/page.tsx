'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2 } from 'lucide-react';
import { formsService } from '@/services/forms';
import { useToast } from '@/components/common/Toast';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateFormModal } from '@/components/form-builder/CreateFormModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { Input } from '@/components/ui/Input';
import { PaginationControls } from '@/components/responses/PaginationControls';
import { useDebounce } from '@/hooks/useDebounce';
import type { Form, FormStatus } from '@/types/form';

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
}: {
  form: Form;
  onDuplicate: (id: string) => void;
  isDuplicating: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const updatedAt = new Date(form.updatedAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formId = form._id;


  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors group">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 transition-colors">
        <FileText size={16} className="text-neutral-500 group-hover:text-brand-600 transition-colors" />
      </div>

      {/* Title + meta */}
      <div className="flex flex-col flex-1 min-w-0">
        <Link
          href={`/forms/${formId}/edit`}
          className="text-body font-semibold text-neutral-800 hover:text-brand-600 transition-colors truncate"
        >
          {form.title}
        </Link>
        <span className="text-caption text-neutral-500 mt-0.5">
          Updated {updatedAt} · {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status badge */}
      <div className="w-34 shrink-0 flex justify-center">
        <Badge variant={STATUS_VARIANT[form.status]}>
          {STATUS_LABEL[form.status]}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 w-48 shrink-0">
        <Link href={`/forms/${formId}/responses`} className="shrink-0">
          <Button variant="ghost" size="small" title="View responses" aria-label={`View responses for ${form.title}`} className="w-8 h-8 p-0 shrink-0">
            <Table2 size={16} />
            <span className="sr-only">Responses</span>
          </Button>
        </Link>

        <Link href={`/forms/${formId}/analytics`} className="shrink-0">
          <Button variant="ghost" size="small" title="View analytics" aria-label={`View analytics for ${form.title}`} className="w-8 h-8 p-0 shrink-0">
            <BarChart2 size={16} />
            <span className="sr-only">Analytics</span>
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="small"
          isLoading={isDuplicating}
          onClick={() => onDuplicate(formId)}
          title="Duplicate form"
          aria-label={`Duplicate ${form.title}`}
          className="w-8 h-8 p-0 shrink-0"
        >
          <Copy size={16} />
          <span className="sr-only">Duplicate</span>
        </Button>

        <Button
          variant="ghost"
          size="small"
          isLoading={isDeleting}
          onClick={() => onDelete(formId)}
          title="Delete form"
          aria-label={`Delete ${form.title}`}
          className="w-8 h-8 p-0 shrink-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
        >
          <Trash2 size={16} />
          <span className="sr-only">Delete</span>
        </Button>

        <Link href={`/forms/${formId}/edit`} className="shrink-0">
          <Button variant="secondary" size="small" aria-label={`Edit ${form.title}`} className="w-8 h-8 p-0 shrink-0">
            <Edit2 size={16} />
            <span className="sr-only">Edit</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FormStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Fetch forms list
  const { data, isLoading, error } = useQuery({
    queryKey: ['forms', 'list', { search: debouncedSearch, status, page, limit: FORMS_PAGE_LIMIT }],
    queryFn: () => formsService.getForms({
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
      page,
      limit: FORMS_PAGE_LIMIT,
    }),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / FORMS_PAGE_LIMIT));

  // Duplicate mutation
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

  // Delete mutation
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
      {/* Page header */}
      <DashboardHeader
        title="Forms"
        subtitle="Build, manage, and publish your forms."
      >
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          aria-label="Create new form"
        >
          <Plus size={16} className="mr-2" />
          Create Form
        </Button>
      </DashboardHeader>

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
        <select
          aria-label="Filter forms by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as FormStatus | 'all');
            setPage(1);
          }}
          className="min-h-11 rounded-md border-2 border-neutral-200 bg-white px-3 text-body-sm outline-none focus:border-neutral-500"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
            <div className="w-9 shrink-0" />
            <span className="flex-1 text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              Form Title
            </span>
            <span className="text-caption font-semibold text-neutral-500 uppercase tracking-wider w-28 shrink-0 text-center">
              Status
            </span>
            <div className="w-48 shrink-0" />
          </div>

          {/* Row placeholders */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 last:border-0 animate-pulse"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-200 shrink-0" />
              <div className="flex flex-col flex-1 gap-1.5 min-w-0">
                <div className="h-3.5 bg-neutral-200 rounded w-1/3" />
                <div className="h-3 bg-neutral-100 rounded w-1/4" />
              </div>
              <div className="w-28 shrink-0 flex justify-center">
                <div className="h-5 w-16 bg-neutral-200 rounded-full" />
              </div>
              <div className="flex items-center justify-end gap-1.5 w-48 shrink-0">
                <div className="w-8 h-8 rounded-md bg-neutral-100" />
                <div className="w-8 h-8 rounded-md bg-neutral-100" />
                <div className="w-8 h-8 rounded-md bg-neutral-100" />
                <div className="w-8 h-8 rounded-md bg-neutral-100" />
                <div className="w-8 h-8 rounded-md bg-neutral-100" />
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
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="flex items-center gap-4 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
            <div className="w-9 shrink-0" />
            <span className="flex-1 text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              Form Title
            </span>
            <span className="text-caption font-semibold text-neutral-500 uppercase tracking-wider w-28 shrink-0 text-center">
              Status
            </span>
            <div className="w-48 shrink-0" />
          </div>

          {/* Rows */}
          {data.forms.map((form) => (
            <FormRow
              key={form._id}
              form={form}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              isDuplicating={duplicatingId === form._id}
              onDelete={(id) => setFormToDelete(data.forms.find((f) => f._id === id) ?? null)}
              isDeleting={deletingId === form._id}
            />
          ))}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50">
            <span className="text-caption text-neutral-500">
              {data.total} form{data.total !== 1 ? 's' : ''} total
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && data && (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Create Form Modal */}
      <CreateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Delete Form Modal */}
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
