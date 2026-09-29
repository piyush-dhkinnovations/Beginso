import { useQuery } from '@tanstack/react-query';
import { tagsService } from '@/services/tags';
import { tagKeys } from '@/lib/queryKeys';

/**
 * Sprint 12 (inbox-collaboration), design.md §10/§12, tasks 2.4/2.5. Only meaningful for a
 * workspace scope — the personal shell has no tag library endpoint (OQ-9's tags-default applies
 * to notes more than a workspace-owned library; the tag picker/manager are workspace-only here,
 * same gate `useMembers` already applies).
 */
export function useTags(scope: string | undefined) {
  return useQuery({
    queryKey: tagKeys.list(scope ?? 'personal'),
    queryFn: () => tagsService.list(scope as string),
    enabled: !!scope && scope !== 'personal',
    staleTime: 5 * 60_000,
  });
}
