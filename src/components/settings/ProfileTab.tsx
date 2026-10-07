'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileNameSchema, type ProfileNameFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { AvatarUploader } from './AvatarUploader';
import { StickySaveBar, useSavedFlash } from './StickySaveBar';

interface ProfileTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ProfileTab({ onDirtyChange }: ProfileTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileNameFormValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: '' },
  });

  // Seed the form once the profile loads — reset() also clears isDirty, so a fresh load never
  // reads as an unsaved change.
  useEffect(() => {
    if (profile) reset({ name: profile.name });
  }, [profile, reset]);

  // `onDirtyChange` is an inline arrow function at the call site (SettingsPage), so it gets a new
  // identity every render — depending on it directly would re-fire this effect (and the parent's
  // setState) every render, an infinite loop. Same "latest ref" pattern Modal.tsx already uses for
  // the same reason: the effect below depends only on `isDirty`, not the callback's identity.
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  const [saved, flashSaved] = useSavedFlash();
  const updateNameMutation = useMutation({
    mutationFn: (name: string) => settingsService.updateProfile({ name }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
      reset({ name: updated.name });
      flashSaved();
      toast('Display name saved.', 'success');
    },
    onError: (error) => toast(getFriendlyErrorMessage(error, { action: 'change your profile', fallback: 'Display name was not saved. Please try again.' }), 'error'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-(--border-default)" />
        <div className="h-10 bg-(--border-default) rounded w-full" />
        <div className="h-10 bg-(--border-subtle) rounded w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-(--border-default) bg-(--surface-card) p-4">
        <p className="bg-body-sm text-(--text-primary)">Unable to load your profile.</p>
        <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AvatarUploader name={profile.name} avatarUrl={profile.avatarUrl} />

      <form onSubmit={handleSubmit((values) => updateNameMutation.mutate(values.name))} className="flex flex-col gap-4">
        <Input id="profile-name" label="Display name" error={errors.name?.message} {...register('name')} />

        <Input id="profile-email" label="Email" value={profile.email} disabled readOnly />
        <p className="-mt-2 bg-caption text-(--text-muted)">
          Your email is your sign-in and can&apos;t be changed here yet. To use a different address, contact support.
        </p>

        <StickySaveBar
          dirty={isDirty}
          saving={isSubmitting || updateNameMutation.isPending}
          saved={saved}
          subject="Your profile"
          onDiscard={() => reset()}
        />
      </form>
    </div>
  );
}
