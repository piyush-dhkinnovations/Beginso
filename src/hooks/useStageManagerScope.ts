import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canManageStages } from '@/lib/roles';

/**
 * Sprint 12 (inbox-collaboration), task 5.1. Same gap and same pragmatic fix as
 * `useTagManagerScope` — the stage library is workspace-owned and Owner/Admin only, but this
 * personal `(user)/settings` page has no per-page workspace scope. Picks the caller's first
 * workspace where they can manage stages.
 */
export function useStageManagerScope(): string | undefined {
  const { data } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    staleTime: 5 * 60_000,
  });

  return data?.find((w) => canManageStages(w.role))?.slug;
}
