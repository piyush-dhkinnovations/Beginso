'use client';

import { useEffect, useRef, useState } from 'react';
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
  /** Emails of the people already in the workspace: inviting one of them is refused on the spot, not after a round trip. */
  existingEmails?: string[];
  isOpen: boolean;
  onClose: () => void;
}

// Mirrors CreateWorkspaceModal's exact shape (design.md §6): react-hook-form + zod resolver,
// focus-on-open, disable-while-pending, toast+keep-open on error. Role options exclude 'owner'
// entirely — ownership only transfers, never gets invited into (requirements.md §7.4).
export function InviteMembersModal({ workspaceId, existingEmails = [], isOpen, onClose }: InviteMembersModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const emailsInputRef = useRef<HTMLInputElement>(null);
  // A problem with the addresses themselves (already a member, or refused by the server): shown under the field, where the person is looking.
  const [emailsError, setEmailsError] = useState<string | null>(null);

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
      // Resets whenever the modal opens (the component stays mounted across opens): the same accepted exception DeleteWorkspaceModal uses.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmailsError(null);
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
      setEmailsError(getFriendlyErrorMessage(error, { action: 'invite people to this workspace', fallback: 'Invitations were not sent. Please try again.' }));
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Members"
      description="Send an invitation by email — they'll join with the role you choose below."
    >
      <form
        onSubmit={handleSubmit((data) => {
          const members = new Set(existingEmails.map((e) => e.trim().toLowerCase()));
          const already = data.emails.split(',').map((e) => e.trim()).filter((e) => members.has(e.toLowerCase()));
          if (already.length > 0) {
            setEmailsError(already.length === 1 ? `${already[0]} is already a member of this workspace.` : `${already.join(', ')} are already members of this workspace.`);
            return;
          }
          setEmailsError(null);
          mutation.mutate(data);
        })}
        className="flex flex-col gap-4"
      >
        <Input
          id="invite-emails-input"
          label="Email Addresses"
          placeholder="priya@company.com, sam@company.com"
          error={errors.emails?.message ?? emailsError ?? undefined}
          {...register('emails', { onChange: () => setEmailsError(null) })}
          ref={(el) => {
            (register('emails', { onChange: () => setEmailsError(null) }) as { ref: (el: HTMLInputElement | null) => void }).ref(el);
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
