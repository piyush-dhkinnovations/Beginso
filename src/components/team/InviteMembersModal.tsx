'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { invitationsService } from '@/services/invitations';
import { teamKeys } from '@/lib/queryKeys';
import { inviteMembersSchema, type InviteMembersValues } from '@/lib/schemas/inviteMembersSchema';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

export interface InviteMembersModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Mirrors CreateWorkspaceModal's exact shape (design.md §6): react-hook-form + zod resolver,
// focus-on-open, disable-while-pending, toast+keep-open on error. Role options exclude 'owner'
// entirely — ownership only transfers, never gets invited into (requirements.md §7.4).
export function InviteMembersModal({ workspaceId, isOpen, onClose }: InviteMembersModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const emailsInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMembersValues>({
    resolver: zodResolver(inviteMembersSchema),
    defaultValues: { role: 'member' },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ emails: '', role: 'member' });
      setTimeout(() => emailsInputRef.current?.focus(), 50);
    }
  }, [isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (data: InviteMembersValues) => {
      const emails = data.emails.split(',').map((email) => email.trim()).filter(Boolean);
      return invitationsService.send(workspaceId, emails, data.role);
    },
    onSuccess: (_d, data) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(workspaceId) });
      const n = data.emails.split(',').map((e) => e.trim()).filter(Boolean).length;
      toast(n === 1 ? `Invitation sent to ${data.emails.trim()}.` : `${n} invitations sent.`, 'success');
      onClose();
    },
    onError: (error) => {
      toast(getFriendlyErrorMessage(error, { action: 'invite people to this workspace', fallback: 'Invitations were not sent. Please try again.' }), 'error');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Members"
      description="Send an invitation by email — they'll join with the role you choose below."
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
        <Input
          id="invite-emails-input"
          label="Email Addresses"
          placeholder="priya@company.com, sam@company.com"
          error={errors.emails?.message}
          {...register('emails')}
          ref={(el) => {
            (register('emails') as { ref: (el: HTMLInputElement | null) => void }).ref(el);
            (emailsInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }}
        />

        <Select id="invite-role-select" label="Role" error={errors.role?.message} {...register('role')}>
          <option value="member">Editor — can build and edit forms</option>
          <option value="viewer">Reviewer — can review assigned responses</option>
          <option value="admin">Admin — full workspace access</option>
        </Select>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Send Invites
          </Button>
        </div>
      </form>
    </Modal>
  );
}
