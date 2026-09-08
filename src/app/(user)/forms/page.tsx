'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, Table2, Trash2, Edit2, BarChart2, MoreVertical, FolderSymlink } from 'lucide-react';
import { formsService } from '@/services/forms';
import { workspaceKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateFormModal } from '@/components/form-builder/CreateFormModal';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';
import { MoveFormModal } from '@/components/workspaces/MoveFormModal';
import { Input } from '@/components/ui/Input';
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
  const updatedAt = new Date(form.updatedAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formId = form._id;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <div className="forms-row px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors group">
      <div className="[grid-area:icon] w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 transition-colors">
        <FileText size={16} className="text-neutral-500 group-hover:text-brand-600 transition-colors" />
      </div>

      <div className="[grid-area:title] flex flex-col min-w-0">
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

      <div className="[grid-area:badge] flex justify-start sm:justify-center">
        <StatusBadge variant={STATUS_VARIANT[form.status]}>
          {STATUS_LABEL[form.status]}
        </StatusBadge>
      </div>

      <div className="[grid-area:actions] flex items-center justify-end gap-1.5">
        <Link
          href={`/forms/${formId}/edit`}
          className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
          title="Edit Form"
          aria-label="Edit Form"
        >
          <Edit2 size={16} />
        </Link>

        {/* Row menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
            title="More Options"
            aria-label="More Options"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-30 animate-fade-in"
            >
              <Link
                href={`/forms/${formId}/responses`}
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <Table2 size={16} className="text-neutral-500" />
                <span>View Responses</span>
              </Link>

              <Link
                href={`/forms/${formId}/analytics`}
                role="menuitem"
                onClick={() => setIsMenuOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <BarChart2 size={16} className="text-neutral-500" />
                <span>View Analytics</span>
              </Link>

              {onMove && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onMove(form);
                    setIsMenuOpen(false);
                  }}
                  className="w-full min-h-11 flex items-center gap-2 px-3 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors text-left"
                >
                  <FolderSymlink size={16} className="text-neutral-500" />
                  <span>Move</span>
                </button>
              )}

              <button
                type="button"
                role="menuitem"
                disabled={isDuplicating}
                onClick={() => {
                  onDuplicate(formId);
                  setIsMenuOpen(false);
                }}
                className="w-full min-h-11 flex items-center gap-2 px-3 py-2 text-body-sm text-neutral-700 hover:bg-neutral-100 transition-colors text-left disabled:opacity-60"
              >
                <Copy size={16} className="text-neutral-500" />
                <span>{isDuplicating ? 'Duplicating…' : 'Duplicate'}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={isDeleting}
                onClick={() => {
                  onDelete(formId);
                  setIsMenuOpen(false);
                }}
                className="w-full min-h-11 flex items-center gap-2 px-3 py-2 text-body-sm text-rose-600 hover:bg-rose-50 transition-colors text-left disabled:opacity-60"
              >
                <Trash2 size={16} className="text-rose-500" />
                <span>{isDeleting ? 'Deleting…' : 'Delete'}</span>
              </button>
            </div>
          )}
        </div>
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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in">
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

      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          {/* Table header — hidden on the stacked mobile layout, see .forms-row-header */}
          <div className="forms-row forms-row-header px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
            <div className="[grid-area:icon]" />
            <span className="[grid-area:title] text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              Form Title
            </span>
            <span className="[grid-area:badge] text-caption font-semibold text-neutral-500 uppercase tracking-wider text-center">
              Status
            </span>
            <div className="[grid-area:actions]" />
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="forms-row px-4 py-3 border-b border-neutral-100 last:border-0 animate-pulse"
            >
              <div className="[grid-area:icon] w-9 h-9 rounded-lg bg-neutral-200 shrink-0" />
              <div className="[grid-area:title] flex flex-col gap-1.5 min-w-0">
                <div className="h-3.5 bg-neutral-200 rounded w-1/2" />
                <div className="h-3 bg-neutral-100 rounded w-1/3" />
              </div>
              <div className="[grid-area:badge] flex justify-start sm:justify-center">
                <div className="h-5 w-16 bg-neutral-200 rounded-full" />
              </div>
              <div className="[grid-area:actions] flex items-center justify-end gap-1.5">
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
          {/* Table header — hidden on the stacked mobile layout, see .forms-row-header */}
          <div className="forms-row forms-row-header px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
            <div className="[grid-area:icon]" />
            <span className="[grid-area:title] text-caption font-semibold text-neutral-500 uppercase tracking-wider">
              Form Title
            </span>
            <span className="[grid-area:badge] text-caption font-semibold text-neutral-500 uppercase tracking-wider text-center">
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

