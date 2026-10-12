'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { formsService } from '@/services/forms';
import { settingsService } from '@/services/settings';
import { settingsKeys, workspaceKeys } from '@/lib/queryKeys';
import { useWorkspaceList } from '@/hooks/useWorkspaceDestinations';
import { createFormSchema, type CreateFormValues } from '@/lib/schemas/formSchema';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SplitFlowLayout } from '@/components/flow/SplitFlowLayout';
import { FormIllustration } from '@/components/flow/FlowIllustrations';
import { LogoChoice } from '@/components/flow/LogoChoice';
import type { FormDestination } from '@/types/workspace';

/**
 * Full-page "Create a new form" (replaces the old modal). Opened from every New form / Create form button.
 * `?ws=<workspace slug or id>` says where the form is created; without it the form is personal.
 */
export function CreateFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initForm = useBuilderStore((s) => s.initForm);
  const ws = useSearchParams().get('ws');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const { data: workspaces = [] } = useWorkspaceList(!!ws);
  const target = ws ? workspaces.find((w) => w.id === ws || w.slug === ws) : undefined;

  // A new workspace form starts from the workspace's default branding; the form's own logo (if any) wins over it.
  const { data: workspace } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: () => settingsService.getWorkspace(),
    enabled: !!ws,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({ resolver: zodResolver(createFormSchema) });

  const goBack = () => (window.history.length > 1 ? router.back() : router.push(ws ? `/w/${target?.slug ?? ws}/forms` : '/forms'));

  const mutation = useMutation({
    mutationFn: async (data: CreateFormValues) => {
      const destination: FormDestination = target ? { type: 'workspace', workspaceId: target.id } : { type: 'personal' };
      const branding = { ...(workspace?.branding ?? {}), ...(logoUrl ? { logoUrl } : {}) };
      const created = await formsService.createForm({
        ...data,
        destination,
        destinationWorkspaceId: target?.id ?? null,
        ...(Object.keys(branding).length > 0 ? { branding } : {}),
      });
      return { ...created, branding, destination };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.forms(response.destination) });
      queryClient.invalidateQueries({ queryKey: ['forms'] });

      // Seed the store with a fresh empty form so the builder hydrates instantly.
      initForm({
        _id: response._id,
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
      // `?ws=` lets the shell paint the workspace sidebar on the builder's first render.
      router.push(target ? `/forms/${response._id}/edit?ws=${target.slug}` : `/forms/${response._id}/edit`);
    },
    onError: () => toast('Failed to create form. Please try again.', 'error'),
  });

  return (
    <SplitFlowLayout
      eyebrow="Create form"
      title="Create a new form"
      description={`Give your form a name and an optional description to get started. You can always change this later.${target ? ` It will be created in ${target.name}.` : ''}`}
      illustration={<FormIllustration />}
      onClose={goBack}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-6" noValidate>
        <Input
          id="create-form-title-input"
          label="Form Title"
          placeholder="e.g. Customer Feedback Survey"
          autoFocus
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          id="create-form-description-input"
          label="Description (optional)"
          placeholder="What is this form for?"
          rows={3}
          error={errors.description?.message}
          {...register('description')}
        />
        <LogoChoice subject="form" value={logoUrl} onChange={setLogoUrl} disabled={mutation.isPending} />
        <div>
          <Button type="submit" variant="primary" isLoading={mutation.isPending} className="min-h-12 px-6">
            Create Form
            <ArrowRight size={18} className="ml-2" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </SplitFlowLayout>
  );
}
