import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

/**
 * `Workspace.timezone`
 * (`shared/types/Workspace.ts`) is the workspace's IANA display default — this reuses
 * the same `GET /api/workspaces` list `useWorkspaceRole` already queries (cached 5 min) rather
 * than adding a lookup. The personal
 * shell has no workspace, so it falls back to the browser's resolved zone there: a reasonable
 * default, not a real per-user preference. `Membership.timezoneOverride` is not applied here.
 */
export function useWorkspaceTimezone(scope: string): string {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    enabled: scope !== 'personal',
    staleTime: 5 * 60_000,
  });

  if (scope === 'personal') return browserTimezone;
  return data?.find((w) => w.slug === scope)?.timezone ?? browserTimezone;
}
