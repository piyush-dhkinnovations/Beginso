'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { formsService } from '@/services/forms';
import { createFormSchema, CreateFormValues } from '@/lib/schemas/formSchema';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/common/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateFormModal({ isOpen, onClose }: CreateFormModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const initForm = useBuilderStore((s) => s.initForm);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
  });

  // Auto-focus title on open; reset on close
  useEffect(() => {
    if (isOpen) {
      reset();
      // slight delay so the animation doesn't fight the focus
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const mutation = useMutation({
    mutationFn: (data: CreateFormValues) => formsService.createForm(data),
    onSuccess: (response) => {
      const formId = response._id || (response as any).id;
      // Seed the store with a fresh empty form so the builder page hydrates instantly
      initForm({
        _id: formId,
        title: response.title,
        description: undefined,
        workspaceId: '',
        status: 'draft',
        fields: [],
        branding: {},
        settings: { honeypotEnabled: true },
        schemaVersion: 1,
        responseCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
      router.push(`/forms/${formId}/edit`);
    },
    onError: () => {
      toast('Failed to create form. Please try again.', 'error');
      // keep modal open
    },
  });

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => {
        // Close when clicking outside the dialog card
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-form-title"
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 p-6 mx-4 animate-slide-up"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2
            id="create-form-title"
            className="text-heading-2 font-bold text-neutral-900"
          >
            Create New Form
          </h2>
          <p className="text-body-sm text-neutral-500 mt-1">
            Give your form a name to get started.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          <Input
            id="create-form-title-input"
            label="Form Title"
            placeholder="e.g. Customer Feedback Survey"
            error={errors.title?.message}
            {...register('title')}
            ref={(el) => {
              // merge RHF ref + our focus ref
              (register('title') as { ref: (el: HTMLInputElement | null) => void }).ref(el);
              (titleInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }}
          />

          <Input
            id="create-form-description-input"
            label="Description (optional)"
            placeholder="What is this form for?"
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={mutation.isPending}
            >
              Create Form
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
