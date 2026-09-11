'use client';

// Team & Members — requirements.md §7.2/§7.3/§7.4, design.md §15.1. Day 2 (Tuesday, per
// SPRINT-PLAN.md) adds the Pending Invites card and the "Invite Members" header action on top of
// Monday's Members card. The header's "Roles & Permissions" action stays deferred — it still has
// nowhere to navigate to until /w/[slug]/roles (task 4.2) lands Thursday.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { teamService } from '@/services/team';
import { invitationsService } from '@/services/invitations';
import { workspacesService } from '@/services/workspaces';
import { teamKeys, workspaceKeys } from '@/lib/queryKeys';
import { canManageMembers } from '@/lib/roles';
import { MemberTable } from '@/components/team/MemberTable';
import { PendingInvitesTable } from '@/components/team/PendingInvitesTable';
import { InviteMembersModal } from '@/components/team/InviteMembersModal';
import { PageHeader, Card, Alert, Button } from '@/components/ui';
import { useToast } from '@/components/common/Toast';
import type { MemberListItem, PendingInvitation } from '@/types/team';
import type { Role } from '@/types/workspace';

export default function TeamPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // The list endpoint already returns the caller's role per workspace (confirmed live since
  // Sprint 8 — WorkspaceListItem.role) — this page's own canManage gating doesn't need to wait
  // on BE 0.1 (that gap only blocks the *sidebar's* nav visibility, which is resolved
  // server-side in w/[slug]/layout.tsx before this page ever mounts).
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
  });
  const currentWorkspace = workspaces?.find((w) => w.slug === slug);
  const canManage = canManageMembers(currentWorkspace?.role);

  // Members and pending invites are two independent queries (design.md §15/requirements §15
  // performance note) — the page shows whichever loads first rather than blocking on both.
  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: teamKeys.members(slug),
    queryFn: () => teamService.listMembers(slug),
  });

  const {
    data: invitations,
    isLoading: invitationsLoading,
    isError: invitationsError,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: teamKeys.invitations(slug),
    queryFn: () => invitationsService.listPending(slug),
  });

  const roleMutation = useMutation({
    mutationFn: ({ member, role }: { member: MemberListItem; role: Role }) =>
      teamService.updateMemberRole(slug, member.membershipId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(slug) });
      toast('Role updated', 'success');
    },
    onError: () => toast('Failed to update role. Please try again.', 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (member: MemberListItem) => teamService.removeMember(slug, member.membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(slug) });
      toast('Member removed', 'success');
    },
    onError: () => toast('Failed to remove member. Please try again.', 'error'),
  });

  const resendMutation = useMutation({
    mutationFn: (invitation: PendingInvitation) => invitationsService.resend(slug, invitation.id),
    onSuccess: () => toast('Invite resent', 'success'),
    onError: () => toast('Failed to resend invite. Please try again.', 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitation: PendingInvitation) => invitationsService.revoke(slug, invitation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invitations(slug) });
      toast('Invite revoked', 'success');
    },
    onError: () => toast('Failed to revoke invite. Please try again.', 'error'),
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Team & Members"
        description="Manage who has access to this workspace."
        actions={
          canManage ? (
            <Button variant="primary" onClick={() => setIsInviteModalOpen(true)}>
              Invite Members
            </Button>
          ) : undefined
        }
      />

      <Card>
        {membersError ? (
          <Alert variant="error" title="We could not load your team.">
            <Button variant="secondary" size="small" onClick={() => void refetchMembers()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <MemberTable
            members={members ?? []}
            currentUserId={user?.id ?? ''}
            canManage={canManage}
            isLoading={membersLoading}
            onRoleChange={(member, role) => roleMutation.mutate({ member, role })}
            onRemove={(member) => removeMutation.mutate(member)}
          />
        )}
      </Card>

      {/* Pending invites is a secondary, visually separate table (requirements.md §7.3, wireframe
          notes) — never merged into the Members card above it. Hidden entirely for a non-manager
          rather than shown empty, since there's nothing on it they're allowed to act on. */}
      {canManage && (
        <Card>
          {invitationsError ? (
            <Alert variant="error" title="We could not load pending invites.">
              <Button variant="secondary" size="small" onClick={() => void refetchInvitations()}>
                Retry
              </Button>
            </Alert>
          ) : (
            <PendingInvitesTable
              invitations={invitations ?? []}
              canManage={canManage}
              isLoading={invitationsLoading}
              onResend={(invitation) => resendMutation.mutate(invitation)}
              onRevoke={(invitation) => revokeMutation.mutate(invitation)}
            />
          )}
        </Card>
      )}

      <InviteMembersModal
        workspaceId={slug}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
