import { useQuery } from '@tanstack/react-query';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

// A shared hook,
// so the template-apply destination picker doesn't duplicate the same queryKey/queryFn a second
// time. `enabled` defaults to true, so
// callers that don't pass it are unaffected.
export function useWorkspaceList(enabled = true) {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled,
  });
}
