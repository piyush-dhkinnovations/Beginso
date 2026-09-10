'use client';

// Team & Members — requirements.md §7.2, design.md §15.1. Today's slice (Sprint 9 Day 1, per
// SPRINT-PLAN.md's Monday row) is the Members card only: role select, remove. The Pending
// Invites card (§7.3) and the header's "Invite Members"/"Roles & Permissions" actions land
// Tuesday/Thursday once InviteMembersModal (task 4.5) and /w/[slug]/roles (task 4.2) exist to be
// their destinations — wiring a button to a page that doesn't exist yet would be worse than not
// showing it.
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { teamService } from '@/services/team';
import { workspacesService } from '@/services/workspaces';
import { teamKeys, workspaceKeys } from '@/lib/queryKeys';
import { canManageMembers } from '@/lib/roles';
import { MemberTable } from '@/components/team/MemberTable';
import { PageHeader, Card, Alert, Button } from '@/components/ui';
import { useToast } from '@/components/common/Toast';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';

export default function TeamPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const {
    data: members,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: teamKeys.members(slug),
    queryFn: () => teamService.listMembers(slug),
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Team & Members" description="Manage who has access to this workspace." />

      <Card>
        {isError ? (
          <Alert variant="error" title="We could not load your team.">
            <Button variant="secondary" size="small" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        ) : (
          <MemberTable
            members={members ?? []}
            currentUserId={user?.id ?? ''}
            canManage={canManage}
            isLoading={isLoading}
            onRoleChange={(member, role) => roleMutation.mutate({ member, role })}
            onRemove={(member) => removeMutation.mutate(member)}
          />
        )}
      </Card>
    </div>
  );
}
