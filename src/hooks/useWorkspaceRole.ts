import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import type { Role } from '@/types/workspace';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §14: role-gated bulk actions ("a hidden
 * action is omitted, not disabled") need the caller's role in the Inbox's own scope. No
 * slug-scoped "get my role" endpoint exists yet — reuses the already-live `GET /api/workspaces`
 * list (same data `ContextSwitcher` reads) and finds the entry matching this scope, same pattern
 * `forms/[id]/overview/page.tsx` uses for a workspace id it already has in hand.
 *
 * Personal scope has no membership/role concept — always 'owner' (matches that page's own
 * `workspaceId === null ? 'owner' : workspace?.role` precedent, since the personal-shell caller
 * owns everything they see there).
 */
export function useWorkspaceRole(scope: string): Role | undefined {
  const { data } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    enabled: scope !== 'personal',
    staleTime: 5 * 60_000,
  });

  if (scope === 'personal') return 'owner';
  return data?.find((w) => w.slug === scope)?.role;
}
