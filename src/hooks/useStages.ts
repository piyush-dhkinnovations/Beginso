import { useQuery } from '@tanstack/react-query';
import { stagesService } from '@/services/stages';
import { stageKeys } from '@/lib/queryKeys';

/**
 * Sprint 12 (inbox-collaboration), design.md §10: "Stage/tag/member lists cached staleTime ≈ 5 min
 * (change rarely)." `scope` is a workspace slug; stages are fixed defaults for the personal shell
 * (OQ-9), so this hook is only enabled for a real workspace scope.
 */
export function useStages(scope: string | undefined) {
  return useQuery({
    queryKey: stageKeys.list(scope ?? 'personal'),
    queryFn: () => stagesService.list(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
