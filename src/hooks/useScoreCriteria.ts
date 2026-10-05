import { useQuery } from '@tanstack/react-query';
import { scoresService } from '@/services/scores';
import { scoreKeys } from '@/lib/queryKeys';

/**
 * Sprint 12 (inbox-collaboration), task 5.3. Read-only list for any consumer that just needs the
 * workspace's criteria (ScoreCard in the detail sidebar) — the Settings page passes its workspace slug as the
 * Owner/Admin-only variant the Settings manager uses to pick which workspace to manage.
 */
export function useScoreCriteria(scope: string | undefined) {
  return useQuery({
    queryKey: scoreKeys.criteria(scope ?? 'personal'),
    queryFn: () => scoresService.listCriteria(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
