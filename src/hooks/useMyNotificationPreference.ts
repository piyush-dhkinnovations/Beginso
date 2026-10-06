import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services/team';
import { teamKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

/**
 * Sprint 14 (OQ-2): the signed-in member's own Membership.notificationPreference for a workspace.
 * Read from the members list (the only live read of it), matched on the caller's user id; the
 * Notifications tab and the publish pre-flight share this cache entry. Personal scope has no
 * membership, so the query is disabled there.
 */
export function useMyNotificationPreference(scope: string) {
  const { user } = useAuth();
  const members = useQuery({
    queryKey: teamKeys.members(scope),
    queryFn: () => teamService.listMembers(scope),
    enabled: scope !== 'personal' && !!user,
    staleTime: 60_000,
  });
  return { ...members, preference: members.data?.find((m) => m.userId === user?.id)?.notificationPreference };
}
