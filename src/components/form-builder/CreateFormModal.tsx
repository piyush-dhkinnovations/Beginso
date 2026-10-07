'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { settingsService } from '@/services/settings';
import { settingsKeys, workspaceKeys } from '@/lib/queryKeys';
import { useWorkspaceList } from '@/hooks/useWorkspaceDestinations';
import { createFormSchema, CreateFormValues } from '@/lib/schemas/formSchema';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { FormDestination } from '@/types/workspace';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDestination?: FormDestination;
}

// ─── Component ────────────────────────────────────────────────────────────────

// Wireframe Screen 40: Create Form (destination) (requirements.md §7.7, B1.4, design.md §15.7).
// Adds the destination picker: hidden when user has 0 workspaces; defaults to current context;
// passes destination to formsService.createForm.
export function CreateFormModal({ isOpen, onClose, defaultDestination }: CreateFormModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initForm = useBuilderStore((s) => s.initForm);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const defaultDestId =
    defaultDestination?.type === 'workspace' ? defaultDestination.workspaceId : 'personal';
  // No picker: the form is created where the user already is (Personal space or the current workspace).
  const destination = defaultDestId;

  // Fetch workspaces to populate the destination selector
  const { data: workspaces = [] } = useWorkspaceList(isOpen);

  // Shares the same cache Settings' BrandingTab reads/writes — new forms should start with the
  // workspace's default branding (Requirement 6's Branding_Defaults concept), and `POST
  // /api/forms` only ever accepted `{title, description}`, never branding. Applied here via a
  // follow-up `PATCH` (already confirmed to accept `branding`) rather than waiting on a backend
  // change to the create endpoint.
  const { data: workspace } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: () => settingsService.getWorkspace(),
    // Real bug found and fixed: this query was missing the `enabled: isOpen` guard the sibling
    // query above already has, so it fired unconditionally the moment this always-mounted modal
    // rendered — on every Forms page load, for every account. For a brand-new account with zero
    // workspaces (Sprint 7's C1.3 lazy-provisioning model), GET /api/workspaces/current legitimately
    // 404s since there's no "current" workspace to resolve, producing a silent failed request on
    // every page load.
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset();
      // slight delay so the animation doesn't fight the focus
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    onClose();
  };



  const mutation = useMutation({
    mutationFn: async (data: CreateFormValues) => {
      // `destination` is the URL slug when it comes from `defaultDestination` (a workspace
      // page's own context — see FormsContext/formsService.ts's own comment on why that's a
      // slug, not an id) but the real Mongo `_id` when it comes from the Select dropdown (built
      // from `workspaces`, which carries both). POST /api/forms needs the real id in the body —
      // unlike GET, there's no `x-workspace-slug` header fallback here — so resolve through the
      // fetched workspace list before sending, whichever shape `destination` happens to be.
      const resolvedWorkspaceId =
        destination === 'personal'
          ? null
          : (workspaces.find((ws) => ws.id === destination || ws.slug === destination)?.id ?? destination);

      const destPayload: FormDestination =
        resolvedWorkspaceId === null
          ? { type: 'personal' }
          : { type: 'workspace', workspaceId: resolvedWorkspaceId };

      const created = await formsService.createForm({
        ...data,
        destination: destPayload,
        destinationWorkspaceId: resolvedWorkspaceId,
      });

      const defaultBranding = workspace?.branding;
      if (defaultBranding && Object.keys(defaultBranding).length > 0) {
        // Non-fatal: the form still exists even if this follow-up save fails.
        await formsService.updateForm(created._id, { branding: defaultBranding }).catch(() => {});
      }
      return { ...created, branding: defaultBranding ?? {}, destination: destPayload };
    },
    onSuccess: (response) => {
      const formId = response._id;
      // Invalidate destination query cache
      queryClient.invalidateQueries({ queryKey: workspaceKeys.forms(response.destination) });
      queryClient.invalidateQueries({ queryKey: ['forms'] });

      // Seed the store with a fresh empty form so the builder page hydrates instantly
      initForm({
        _id: formId,
        title: response.title,
        description: undefined,
        workspaceId: response.destination.type === 'workspace' ? response.destination.workspaceId : '',
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
      // Same `?ws=` hint forms/page.tsx's own links carry — lets PersonalShell paint the
      // workspace sidebar on the builder's first render instead of flashing Personal while it
      // re-fetches the form to work out its workspace from scratch.
      const responseDestination = response.destination;
      const destinationSlug =
        responseDestination.type === 'workspace'
          ? workspaces.find((ws) => ws.id === responseDestination.workspaceId)?.slug
          : undefined;
      router.push(destinationSlug ? `/forms/${formId}/edit?ws=${destinationSlug}` : `/forms/${formId}/edit`);
    },
    onError: () => {
      toast('Failed to create form. Please try again.', 'error');
      // keep modal open
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
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

