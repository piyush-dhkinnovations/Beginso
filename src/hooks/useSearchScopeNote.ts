'use client';

import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

export const RESPONSES_SCOPE_NOTE = "Searching reference and respondent. Answer text isn't searchable yet.";

/** Sprint 14 (requirements 2.4): the scope is stated in the UI - "Searching Acme Corp" in a workspace,
 * the personal sentence otherwise. Prefers the label the server returned; falls back to the cached
 * workspace list so the note is right before the first response arrives. */
export function useSearchScopeNote(scope: string, serverLabel?: string): string {
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => workspacesService.list(),
    enabled: scope !== 'personal',
    staleTime: 5 * 60_000,
  });
  if (scope === 'personal') return 'Searching your personal forms, shared with you, and My Submissions';
  const name = serverLabel || workspaces?.find((w) => w.slug === scope)?.name || 'this workspace';
  return `Searching ${name}`;
}
