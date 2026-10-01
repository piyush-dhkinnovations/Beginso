'use client';

// Team & Members — requirements.md §7.2/§7.3/§7.4, design.md §15.1. Day 2 (Tuesday, per
// SPRINT-PLAN.md) added the Pending Invites card and the "Invite Members" header action on top of
// Monday's Members card. Day 4 (Thursday) wires the "Roles & Permissions" header action now that
// /w/[slug]/roles (task 4.2) exists.
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { teamService } from '@/services/team';
import { invitationsService } from '@/services/invitations';
import { workspacesService } from '@/services/workspaces';
import { teamKeys, workspaceKeys } from '@/lib/queryKeys';
import { canManageMembers, canViewAudit } from '@/lib/roles';
import { MemberTable } from '@/components/team/MemberTable';
import { PendingInvitesTable } from '@/components/team/PendingInvitesTable';
import { InviteMembersModal } from '@/components/team/InviteMembersModal';
import { PageHeader, Card, Alert, Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { useToast } from '@/components/ui/Toast';
import type { MemberListItem, PendingInvitation } from '@/types/team';
import type { Role } from '@/types/workspace';

export default function TeamPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);

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
  // Only the owner may change or remove admins and hand the workspace on (the server enforces it).
  const callerIsOwner = currentWorkspace?.role === 'owner';

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
    onError: (error) => toast(getFriendlyErrorMessage(error), 'error'),
  });

  const removeMutation = useMutation({
    mutationFn: (member: MemberListItem) => teamService.removeMember(slug, member.membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(slug) });
      // Sprint 12, task 5.6: a removed member may still hold response assignments/notes — the
      // Inbox must reflect "no longer has access" without a manual refresh. `invalidateQueries`
      // partial-matches by array prefix, so the bare `['responses', slug]` prefix catches every
      // formId variant (responseKeys.all/.list/.detail/.stats all start with it), not just the
      // 'all' formId segment that `responseKeys.all(slug)` alone would produce.
      queryClient.invalidateQueries({ queryKey: ['responses', slug] });
      toast('Member removed', 'success');
    },
    onError: (error) => toast(getFriendlyErrorMessage(error), 'error'),
  });

  const transferMutation = useMutation({
    mutationFn: (member: MemberListItem) => teamService.transferOwnership(slug, member.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members(slug) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      toast('Ownership transferred. You are now an admin.', 'success');
    },
    onError: (error) => toast(getFriendlyErrorMessage(error), 'error'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => teamService.leave(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() });
      toast('You left the workspace.', 'success');
      router.push('/workspaces');
    },
    onError: (error) => {
      setIsLeaveOpen(false);
      toast(getFriendlyErrorMessage(error), 'error');
    },
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
          <>
            {/* Reachable by any member (requirements.md §7.6) — the matrix is a read-only
                reference, not a manage action, so it isn't gated behind canManage. */}
            <Button variant="secondary" onClick={() => router.push(`/w/${slug}/roles`)}>
              Roles & Permissions
            </Button>
            {currentWorkspace && !callerIsOwner && (
              <Button variant="secondary" onClick={() => setIsLeaveOpen(true)}>
                Leave workspace
              </Button>
            )}
            {canManage && (
              <Button variant="primary" onClick={() => setIsInviteModalOpen(true)}>
                Invite Members
              </Button>
            )}
          </>
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
            callerIsOwner={callerIsOwner}
            isLoading={membersLoading}
            onRoleChange={(member, role) => roleMutation.mutate({ member, role })}
            onRemove={(member) => removeMutation.mutate(member)}
            onTransferOwnership={(member) => transferMutation.mutate(member)}
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

      {/* Bottom-of-page link from the wireframe (sprint-10 requirements.md §7.7). Only offered to
          roles that can open the Audit Log — a Reviewer/Editor would just land on its denied state. */}
      {canViewAudit(currentWorkspace?.role) && (
        <Link href={`/w/${slug}/audit`} className="bg-body-sm self-start">
          View Audit Log →
        </Link>
      )}

      <Modal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        title="Leave this workspace?"
        description="You will lose access to its forms and responses immediately. An owner or admin can invite you back."
      >
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-(--border-default)">
          <Button type="button" variant="secondary" onClick={() => setIsLeaveOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" isLoading={leaveMutation.isPending} onClick={() => leaveMutation.mutate()}>
            Leave workspace
          </Button>
        </div>
      </Modal>

      <InviteMembersModal
        workspaceId={slug}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
