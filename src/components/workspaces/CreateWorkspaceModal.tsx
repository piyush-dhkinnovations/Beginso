'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { createWorkspaceSchema, CreateWorkspaceValues } from '@/lib/schemas/workspaceSchema';
import { useToast } from '@/components/common/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Name-only create flow (requirements.md §7.5) — slug generated server-side, timezone defaulted,
// matching BE 1.1's confirmed contract (design.md §13). Mirrors CreateFormModal's exact
// react-hook-form + zod + ui/Modal shape rather than inventing a new pattern.
export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceValues>({
    resolver: zodResolver(createWorkspaceSchema),
  });

  useEffect(() => {
    if (isOpen) {
      reset();
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: CreateWorkspaceValues) => workspacesService.create(data),
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      onClose();
      router.push(`/w/${workspace.slug}`);
    },
    onError: () => {
      toast('Failed to create workspace. Please try again.', 'error');
      // keep modal open
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create workspace" description="Give your workspace a name to get started.">
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
        <Input
          id="create-workspace-name-input"
          label="Workspace name"
          placeholder="e.g. Marketing Team"
          error={errors.name?.message}
          {...register('name')}
          ref={(el) => {
            (register('name') as { ref: (el: HTMLInputElement | null) => void }).ref(el);
            (nameInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Create workspace
          </Button>
        </div>
      </form>
    </Modal>
  );
}
