import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { canManageTags } from '@/lib/roles';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.7 (task 2.5): the tag library is
 * workspace-owned (`/api/workspaces/:workspaceId/tags`), Owner/Admin only — but the personal
 * `(user)/settings` page (where this tab lives, per tasks.md's file list) has no per-page
 * workspace scope the way `/w/[slug]/...` routes do. Same class of gap task 1.10 hit with
 * ReportsView's stage picker ("no fetchable stage list there"): resolved here the same pragmatic
 * way — the caller's first workspace where they can manage tags, from the already-live
 * `GET /api/workspaces` list. A real per-workspace Settings surface is the eventual fix once one
 * exists; tracked as a follow-up, not solved here.
 */
export function useTagManagerScope(): string | undefined {
  const { data } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    staleTime: 5 * 60_000,
  });

  return data?.find((w) => canManageTags(w.role))?.slug;
}
