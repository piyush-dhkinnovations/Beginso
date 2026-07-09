'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, FileText, ChevronRight } from 'lucide-react';
import { formsService } from '@/services/forms';
import { useToast } from '@/components/common/Toast';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CreateFormModal } from '@/components/form-builder/CreateFormModal';
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

// ─── Row component ────────────────────────────────────────────────────────────

function FormRow({
  form,
  onDuplicate,
  isDuplicating,
}: {
  form: Form;
  onDuplicate: (id: string) => void;
  isDuplicating: boolean;
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
        <span className="text-caption text-neutral-400 mt-0.5">
          Updated {updatedAt} · {form.responseCount} response{form.responseCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status badge */}
      <Badge variant={STATUS_VARIANT[form.status]}>
        {STATUS_LABEL[form.status]}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="small"
          isLoading={isDuplicating}
          onClick={() => onDuplicate(formId)}
          title="Duplicate form"
          aria-label={`Duplicate ${form.title}`}
        >
          <Copy size={14} className="mr-1.5" />
          Duplicate
        </Button>

        <Link href={`/forms/${formId}/edit`}>
          <Button variant="secondary" size="small" aria-label={`Edit ${form.title}`}>
            Edit
            <ChevronRight size={14} className="ml-1" />
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

  // Fetch forms list
  const { data, isLoading, error } = useQuery({
    queryKey: ['forms'],
    queryFn: () => formsService.getForms(),
  });

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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <DashboardHeader
          title="Forms"
          subtitle="Build, manage, and publish your forms."
        />
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          aria-label="Create new form"
          className="mt-1 shrink-0"
        >
          <Plus size={16} className="mr-2" />
          Create Form
        </Button>
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-body text-error">Failed to load forms. Please refresh.</p>
        </div>
      ) : !data || data.forms.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          heading="No forms yet"
          body="Create your first form to get started collecting responses."
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
            <span className="text-caption font-semibold text-neutral-500 uppercase tracking-wider w-24 text-center">
              Status
            </span>
            <div className="w-40 shrink-0" />
          </div>

          {/* Rows */}
          {data.forms.map((form) => (
            <FormRow
              key={form._id}
              form={form}
              onDuplicate={(id) => duplicateMutation.mutate(id)}
              isDuplicating={duplicatingId === form._id}
            />
          ))}

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50">
            <span className="text-caption text-neutral-400">
              {data.total} form{data.total !== 1 ? 's' : ''} total
            </span>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      <CreateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
