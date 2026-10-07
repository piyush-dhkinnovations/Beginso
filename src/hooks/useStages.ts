import { useQuery } from '@tanstack/react-query';
import { stagesService } from '@/services/stages';
import { stageKeys } from '@/lib/queryKeys';
import { PERSONAL_DEFAULT_STAGES } from '@/types/stage';

/**
 * Sprint 12 (inbox-collaboration), design.md §10: "Stage/tag/member lists cached staleTime ≈ 5 min
 * (change rarely)." `scope` is a workspace slug; stages are fixed defaults for the personal shell
 * (OQ-9) — no network call for those, `PERSONAL_DEFAULT_STAGES` is returned directly. Bug fix,
 * Sprint 12 close-out: this previously just disabled the query for personal scope without
 * supplying the promised defaults, so the Stage select had zero options there and rendered blank.
 */
export function useStages(scope: string | undefined) {
  const isPersonal = !scope || scope === 'personal';
  const query = useQuery({
    queryKey: stageKeys.list(scope ?? 'personal'),
    queryFn: () => stagesService.list(scope as string),
    enabled: !isPersonal,
    staleTime: 5 * 60_000,
  });
  return isPersonal ? { ...query, data: PERSONAL_DEFAULT_STAGES, isLoading: false, isPending: false } : query;
}
