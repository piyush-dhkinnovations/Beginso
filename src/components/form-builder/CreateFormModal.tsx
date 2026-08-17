'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { createFormSchema, CreateFormValues } from '@/lib/schemas/formSchema';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/common/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

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

  // Shares the same cache Settings' BrandingTab reads/writes — new forms should start with the
  // workspace's default branding (Requirement 6's Branding_Defaults concept), and `POST
  // /api/forms` only ever accepted `{title, description}`, never branding. Applied here via a
  // follow-up `PATCH` (already confirmed to accept `branding`) rather than waiting on a backend
  // change to the create endpoint.
  const { data: workspace } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: settingsService.getWorkspace,
  });

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



  const mutation = useMutation({
    mutationFn: async (data: CreateFormValues) => {
      const created = await formsService.createForm(data);
      const defaultBranding = workspace?.branding;
      if (defaultBranding && Object.keys(defaultBranding).length > 0) {
        // Non-fatal: the form still exists even if this follow-up save fails.
        await formsService.updateForm(created._id, { branding: defaultBranding }).catch(() => {});
      }
      return { ...created, branding: defaultBranding ?? {} };
    },
    onSuccess: (response) => {
      const formId = response._id;
      // ponytail: Brittle hardcoded schema defaults.
      // Upgrade path: extract this to a shared factory function in src/types/form.ts
      // Seed the store with a fresh empty form so the builder page hydrates instantly
      initForm({
        _id: formId,
        title: response.title,
        description: undefined,
        workspaceId: '',
        status: 'draft',
        fields: [],
        pages: [],
        branding: response.branding,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Form"
      description="Give your form a name to get started."
    >
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
    </Modal>
  );
}
