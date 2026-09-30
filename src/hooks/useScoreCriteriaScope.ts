import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canManageScoring } from '@/lib/roles';

/**
 * Sprint 12 (inbox-collaboration), task 5.2. Same gap and same pragmatic fix as
 * `useStageManagerScope`/`useTagManagerScope` — score criteria are workspace-owned and
 * Owner/Admin only, but the personal `(user)/settings` page has no per-page workspace scope.
 * Picks the caller's first workspace where they can manage scoring criteria.
 */
export function useScoreCriteriaScope(): string | undefined {
  const { data } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    staleTime: 5 * 60_000,
  });

  return data?.find((w) => canManageScoring(w.role))?.slug;
}
