import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services/team';
import { teamKeys } from '@/lib/queryKeys';

/**
 * Sprint 12 (inbox-collaboration), design.md §6/§10: the assignee/mention pickers reuse
 * `teamService.listMembers` (already built for Sprint 9's Team page) rather than a new endpoint.
 * Only meaningful for a workspace scope — the personal shell has no team (OQ-9).
 */
export function useMembers(scope: string | undefined) {
  return useQuery({
    queryKey: teamKeys.members(scope ?? 'personal'),
    queryFn: () => teamService.listMembers(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
