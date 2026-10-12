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
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SplitFlowLayout } from '@/components/flow/SplitFlowLayout';
import { WorkspaceIllustration } from '@/components/flow/FlowIllustrations';
import { LogoChoice } from '@/components/flow/LogoChoice';

/** Full-page "Create a workspace" — same layout as Create a new form. The logo, if chosen, shows in the sidebar. */
export function CreateWorkspacePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [logo, setLogo] = useState<string | null>(null);

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
    onError: () => toast('Failed to create workspace. Please try again.', 'error'),
  });

  return (
    <SplitFlowLayout
      eyebrow="Create workspace"
      title="Create a workspace"
      description="A workspace is a shared home for your team's forms, responses and templates. Give it a name to get started — you can change everything later."
      illustration={<WorkspaceIllustration />}
      onClose={() => (window.history.length > 1 ? router.back() : router.push('/workspaces'))}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-6" noValidate>
        <Input
          id="create-workspace-name-input"
          label="Workspace name"
          placeholder="e.g. Marketing Team"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />
        <LogoChoice subject="workspace" value={logo} onChange={setLogo} disabled={mutation.isPending} />
        <div>
          <Button type="submit" variant="primary" isLoading={mutation.isPending} className="min-h-12 px-6">
            Create workspace
            <ArrowRight size={18} className="ml-2" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </SplitFlowLayout>
  );
}
