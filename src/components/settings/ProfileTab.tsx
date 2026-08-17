'use client';

<<<<<<< Updated upstream
import { useEffect, useRef } from 'react';
=======
<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
=======
import { useEffect, useRef } from 'react';
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileNameSchema, type ProfileNameFormValues } from '@/lib/schemas/settingsSchemas';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { useToast } from '@/components/common/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AvatarUploader } from './AvatarUploader';
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
import { ChangePasswordModal } from './ChangePasswordModal';
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes

interface ProfileTabProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ProfileTab({ onDirtyChange }: ProfileTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes

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

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => settingsService.updateProfile({ name }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
      reset({ name: updated.name });
      toast('Profile updated.', 'success');
    },
    onError: () => toast('Failed to update profile. Please try again.', 'error'),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-16 w-16 rounded-full bg-neutral-200" />
        <div className="h-10 bg-neutral-200 rounded w-full" />
        <div className="h-10 bg-neutral-100 rounded w-full" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-body-sm text-neutral-700">Unable to load your profile.</p>
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
        <button
          type="button"
          onClick={() => toast("Changing your email isn't available yet.", 'info')}
          className="self-start text-body-sm text-brand-700 hover:text-brand-900 -mt-2"
        >
          Change email
        </button>

        <Button type="submit" disabled={!isDirty} isLoading={isSubmitting || updateNameMutation.isPending} className="self-start">
          Save changes
        </Button>
      </form>
<<<<<<< Updated upstream
=======
<<<<<<< HEAD

      <div className="border-t border-neutral-100 pt-4">
        <Button variant="secondary" size="small" onClick={() => setIsChangePasswordOpen(true)}>
          Change Password
        </Button>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        email={profile.email}
      />
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
    </div>
  );
}
