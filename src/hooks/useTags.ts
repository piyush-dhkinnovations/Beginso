import { useQuery } from '@tanstack/react-query';
import { tagsService } from '@/services/tags';
import { tagKeys } from '@/lib/queryKeys';

/**
 * Only meaningful for a
 * workspace scope — the personal shell has no tag library endpoint, so the tag picker/manager
 * are workspace-only,
 * same gate `useMembers` already applies.
 */
export function useTags(scope: string | undefined) {
  return useQuery({
    queryKey: tagKeys.list(scope ?? 'personal'),
    queryFn: () => tagsService.list(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
