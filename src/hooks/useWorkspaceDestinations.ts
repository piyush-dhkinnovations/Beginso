import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

// Extracted from CreateFormModal.tsx's inline useQuery (.kiro/specs/public-template-gallery
// design.md "Half B" — "pull the query logic out to a shared hook... rather than copy-pasting")
// so the template-apply destination picker doesn't duplicate the same queryKey/queryFn a second
// time. Same semantics as before: `enabled` defaults to true so existing behavior is unaffected
// for callers that don't pass it.
export function useWorkspaceList(enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled,
  });
}
