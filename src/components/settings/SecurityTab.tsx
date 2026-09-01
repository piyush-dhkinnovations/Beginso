'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsService } from '@/services/settings';
import { settingsKeys } from '@/lib/queryKeys';
import { formatResponseDate } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChangePasswordModal } from './ChangePasswordModal';
import { SessionsList } from './SessionsList';

// Verification/dates share ProfileTab's own settingsKeys.profile() query — no duplicate fetch.
// "Change Password" is shown unconditionally rather than hidden for Google-only accounts, the
// same revised decision Requirement 4.1/ChangePasswordModal already applies (no live Firebase
// session on protected pages to read providerData from — see that component's comment).
export function SecurityTab() {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: settingsService.getProfile,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-heading-2 font-bold text-neutral-900">Account security</h3>

        {isLoading ? (
          <div className="flex flex-col gap-3 animate-pulse rounded-lg border border-neutral-200 bg-white p-4">
            <div className="h-6 bg-neutral-200 rounded w-32" />
            <div className="h-4 bg-neutral-100 rounded w-48" />
            <div className="h-4 bg-neutral-100 rounded w-48" />
          </div>
        ) : isError || !profile ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-body-sm text-neutral-700">Unable to load your security details.</p>
            <Button variant="secondary" size="small" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <Badge variant={profile.emailVerified ? 'active' : 'draft'} className="self-start">
              {profile.emailVerified ? 'Email verified' : 'Email not verified'}
            </Badge>
            <div className="text-body-sm text-neutral-600 flex flex-col gap-1">
              <p>Account created {formatResponseDate(profile.createdAt)}</p>
              <p>Last login {formatResponseDate(profile.lastLoginAt)}</p>
            </div>
            <Button
              variant="secondary"
              size="small"
              className="self-start"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              Change Password
            </Button>
            <ChangePasswordModal
              isOpen={isChangePasswordOpen}
              onClose={() => setIsChangePasswordOpen(false)}
              email={profile.email}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-heading-2 font-bold text-neutral-900">Active sessions</h3>
        <SessionsList />
      </div>
    </div>
  );
}
