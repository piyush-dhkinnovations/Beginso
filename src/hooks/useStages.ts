import { useQuery } from '@tanstack/react-query';
import { stagesService } from '@/services/stages';
import { stageKeys } from '@/lib/queryKeys';
import { PERSONAL_DEFAULT_STAGES } from '@/types/stage';

/**
 * Stage/tag/member lists are cached for about 5 minutes
 * (they change rarely). `scope` is a workspace slug; stages are fixed defaults for the personal shell
 * — no network call for those, `PERSONAL_DEFAULT_STAGES` is returned directly. Bug fix,
 * this previously just disabled the query for personal scope without
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
