import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

/**
 * Sprint 12 (inbox-collaboration), design.md §7.4/§16 (task 3.3). `Workspace.timezone`
 * (`shared/types/Workspace.ts`, sprint-8) is the workspace's IANA display default — this reuses
 * the same `GET /api/workspaces` list `useWorkspaceRole` already queries (cached 5 min) rather
 * than adding a lookup. **Assumption/gap, noted per task 3.3's own instruction:** the personal
 * shell has no workspace and no per-user timezone field exists anywhere in this checkout
 * (`Membership.timezoneOverride`, referenced in `Workspace.timezone`'s own doc comment, isn't
 * modelled on the frontend) — falls back to the browser's resolved zone there, which is a
 * reasonable default but not a real per-user preference.
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
