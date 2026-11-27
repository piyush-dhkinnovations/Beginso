import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services/team';
import { teamKeys } from '@/lib/queryKeys';

/**
 * The assignee/mention pickers reuse
 * `teamService.listMembers` (already built for the Team page) rather than a new endpoint.
 * Only meaningful for a workspace scope — the personal shell has no team.
 */
export function useMembers(scope: string | undefined) {
  return useQuery({
    queryKey: teamKeys.members(scope ?? 'personal'),
    queryFn: () => teamService.listMembers(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
