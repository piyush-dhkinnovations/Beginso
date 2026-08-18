'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { workspaceNameSchema, type WorkspaceNameFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { authService } from '@/services/auth';
import { settingsKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function OnboardingPage() {
  const { user } = useAuth();

  const { data: workspace, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.workspace(),
    queryFn: settingsService.getWorkspace,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceNameFormValues>({
    resolver: zodResolver(workspaceNameSchema),
    defaultValues: { name: '' },
  });

  // Pre-fills with the auto-generated default so the user sees what it currently is and can
  // just confirm it or change it, rather than facing a blank required field with no context.
  useEffect(() => {
    if (workspace) reset({ name: workspace.name });
  }, [workspace, reset]);

  const completeMutation = useMutation({
    mutationFn: async (name: string) => {
      await settingsService.updateWorkspace({ name });
      // Confirmed live 18 Aug 2026 — still caught rather than awaited-and-thrown: the workspace
      // name itself is the part that actually matters to the user, and this is a best-effort
      // completion signal (PATCH /api/workspaces/current above already flips the flag too).
      await authService.completeOnboarding().catch(() => {});
    },
    onSuccess: () => {
      // Hard navigation, not router.push — same reasoning as AuthContext's login(): a fresh
      // request is needed so the next page's session/onboarding-status check isn't served from
      // a stale Router Cache entry.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation refreshes Proxy cookie state
      window.location.href = '/dashboard';
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full flex flex-col gap-4 animate-pulse p-8">
        <div className="h-5 w-2/3 bg-neutral-200 rounded" />
        <div className="h-10 bg-neutral-100 rounded" />
        <div className="h-10 bg-neutral-100 rounded" />
      </Card>
    );
  }

  if (isError || !workspace) {
    return (
      <Card className="w-full flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-body-sm text-neutral-700">Unable to load your workspace.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-1.5 text-center">
        <h2 className="text-heading-2 text-neutral-800">Welcome to Beginso</h2>
        <p className="text-body-sm text-neutral-500">Let&apos;s get your workspace set up.</p>
      </div>

      {user && (
        <div className="flex flex-col gap-1 rounded-md bg-neutral-50 p-3 text-center">
          <p className="text-body-sm font-semibold text-neutral-800">{user.name}</p>
          <p className="text-caption text-neutral-500">{user.email}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit((values) => completeMutation.mutate(values.name))}
        className="flex flex-col gap-4"
      >
        <Input
          id="onboarding-workspace-name"
          label="Workspace name"
          error={errors.name?.message}
          disabled={isSubmitting || completeMutation.isPending}
          {...register('name')}
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting || completeMutation.isPending}
        >
          Continue
        </Button>
      </form>
    </Card>
  );
}
