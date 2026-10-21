import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMembers } from '@/hooks/useMembers';
import { useWorkspaceRole } from '@/hooks/useWorkspaceRole';
import { canViewAudit } from '@/lib/roles';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import type { WorkspaceEventItem } from '@/types/event';

/**
 * The profile picture to show next to an event's actor, or undefined (then their initials show). In order:
 *  1. the picture the backend sent with the event (works for every role);
 *  2. the member's own picture from the team list, matched by user id and then by email, for a backend that does not send one yet.
 *     That list is admin-only, so it is only requested for someone allowed to read it (never a request that is bound to be refused);
 *  3. for an actor with no account that goes by the workspace's own name (the events the system records for the workspace itself),
 *     the workspace logo.
 */
export function useEventAvatars(scope: string | undefined): (event: WorkspaceEventItem) => string | undefined {
  const enabled = !!scope && scope !== 'personal';
  const role = useWorkspaceRole(scope ?? 'personal');
  const { data: members } = useMembers(canViewAudit(role) ? scope : undefined);
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    enabled,
    staleTime: 5 * 60_000,
  });

  const { byId, byEmail } = useMemo(() => {
    const byId = new Map<string, string>();
    const byEmail = new Map<string, string>();
    for (const m of members ?? []) {
      if (!m.avatarUrl) continue;
      byId.set(m.userId, m.avatarUrl);
      byEmail.set(m.email.toLowerCase(), m.avatarUrl);
    }
    return { byId, byEmail };
  }, [members]);

  const workspace = useMemo(() => workspaces?.find((w) => w.slug === scope), [workspaces, scope]);

  return useCallback(
    (event: WorkspaceEventItem) => {
      if (event.actorAvatarUrl) return event.actorAvatarUrl;
      const fromMember = (event.actorId && byId.get(event.actorId)) || (event.actorEmail && byEmail.get(event.actorEmail.toLowerCase()));
      if (fromMember) return fromMember;
      if (!event.actorId && workspace?.logo && event.actorName.trim().toLowerCase() === workspace.name.trim().toLowerCase()) return workspace.logo;
      return undefined;
    },
    [byId, byEmail, workspace]
  );
}
