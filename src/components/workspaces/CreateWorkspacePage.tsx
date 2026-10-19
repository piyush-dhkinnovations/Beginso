'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { createWorkspaceSchema, type CreateWorkspaceValues } from '@/lib/schemas/workspaceSchema';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SplitFlowLayout } from '@/components/flow/SplitFlowLayout';
import { WorkspaceIllustration } from '@/components/flow/FlowIllustrations';
import { LogoChoice } from '@/components/flow/LogoChoice';
import { useAccountUsage } from '@/hooks/useAccountUsage';

/** Full-page "Create a workspace" — same layout as Create a new form. The logo, if chosen, shows in the sidebar. */
export function CreateWorkspacePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [logo, setLogo] = useState<string | null>(null);
  const usage = useAccountUsage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceValues>({ resolver: zodResolver(createWorkspaceSchema) });

  const mutation = useMutation({
    mutationFn: (data: CreateWorkspaceValues) => workspacesService.create({ ...data, ...(logo ? { logo } : {}) }),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      router.push(`/w/${workspace.slug}`);
    },
    onError: (error) => toast(getFriendlyErrorMessage(error, { fallback: 'Failed to create workspace. Please try again.' }), 'error'),
  });

  const atLimit =
    usage?.workspaceLimit !== undefined &&
    usage.workspaceCount !== undefined &&
    usage.workspaceCount >= usage.workspaceLimit;

  return (
    <SplitFlowLayout
      eyebrow="Create workspace"
      title="Create a workspace"
      description="A workspace is a shared home for your team's forms, responses and templates. Give it a name to get started — you can change everything later."
      illustration={<WorkspaceIllustration />}
      tint="#2f56d8"
      panelTitle="One home for your team's forms"
      panelText="Share forms, responses and templates with everyone who needs them."
      onClose={() => (window.history.length > 1 ? router.back() : router.push('/workspaces'))}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-6" noValidate>
        {usage?.workspaceLimit !== undefined && usage.workspaceCount !== undefined && (
          <div
            role={atLimit ? 'alert' : undefined}
            className={atLimit
              ? 'rounded-lg border border-(--error-border) bg-(--error-surface) px-4 py-3 bg-body-sm text-(--error-text)'
              : 'bg-caption text-(--text-muted)'}
          >
            {atLimit
              ? `You've reached the limit of ${usage.workspaceLimit} workspaces. Delete an existing workspace before creating a new one.`
              : `${usage.workspaceCount} of ${usage.workspaceLimit} workspaces used`}
          </div>
        )}
        <Input
          id="create-workspace-name-input"
          label="Workspace name"
          placeholder="e.g. Marketing Team"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <LogoChoice subject="workspace" value={logo} onChange={setLogo} disabled={mutation.isPending || atLimit} />
        <div>
          <Button type="submit" variant="primary" isLoading={mutation.isPending} disabled={atLimit} className="min-h-12 px-6">
            Create workspace
            <ArrowRight size={18} className="ml-2" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </SplitFlowLayout>
  );
}
