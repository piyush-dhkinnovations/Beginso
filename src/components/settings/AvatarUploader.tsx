'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
import { Trash2 } from 'lucide-react';
=======
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
import { useToast } from '@/components/common/Toast';
import { uploadService } from '@/services/upload';
import { settingsService } from '@/services/settings';
import { validateFile } from '@/lib/validateFile';
import { settingsKeys } from '@/lib/queryKeys';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, Requirement 3.2

function getInitials(name: string | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
}

interface AvatarUploaderProps {
  name: string | undefined;
  avatarUrl: string | null | undefined;
}

export function AvatarUploader({ name, avatarUrl }: AvatarUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fileError, setFileError] = useState<string | null>(null);

  // Persists an already-uploaded URL (or null, to remove it) — toasting/reverting on failure is
  // handled by the two callers below, not here, since "upload the file" and "save the URL" are
  // two separate steps that can each fail independently but should read as one error to the user.
  const updateAvatarMutation = useMutation({
    mutationFn: (nextAvatarUrl: string | null) => settingsService.updateProfile({ avatarUrl: nextAvatarUrl }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.profile() }),
  });

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file after an error
    if (!file) return;

    const error = validateFile(file, ALLOWED_AVATAR_TYPES, AVATAR_MAX_SIZE_BYTES);
    if (error) {
      setFileError('Please upload a JPEG, PNG, or WebP image under 5 MB.');
      return;
    }
    setFileError(null);

    try {
      const uploaded = await uploadService.uploadFile(file);
      await updateAvatarMutation.mutateAsync(uploaded.url);
    } catch {
      toast('Failed to update photo. Please try again.', 'error');
    }
  }

  async function handleRemove() {
    if (!window.confirm('Remove your profile photo?')) return;
    try {
      await updateAvatarMutation.mutateAsync(null);
    } catch {
      toast('Failed to update photo. Please try again.', 'error');
    }
  }

  const isBusy = updateAvatarMutation.isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 rounded-full bg-brand-600 text-white flex items-center justify-center text-heading-2 font-bold overflow-hidden">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
        {isBusy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="avatar-file-input"
            accept={ALLOWED_AVATAR_TYPES.join(',')}
            onChange={handleFileSelect}
            className="sr-only"
            disabled={isBusy}
          />
          <label
            htmlFor="avatar-file-input"
            className="min-h-11 inline-flex items-center px-3 rounded-md border-2 border-neutral-200 text-body-sm font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            Change photo
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy}
<<<<<<< Updated upstream
              className="min-h-11 text-body-sm text-rose-600 hover:text-rose-700 disabled:opacity-60"
            >
              Remove photo
=======
<<<<<<< HEAD
              aria-label="Remove photo"
              title="Remove photo"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
            >
              <Trash2 size={16} />
=======
              className="min-h-11 text-body-sm text-rose-600 hover:text-rose-700 disabled:opacity-60"
            >
              Remove photo
>>>>>>> d53f241896fa8475918039766386dcf82cd41a28
>>>>>>> Stashed changes
            </button>
          )}
        </div>
        {fileError && <p className="text-caption text-error">{fileError}</p>}
      </div>
    </div>
  );
}
