import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';

/**
 * The x-workspace-slug scope for a form's detail routes (/forms/:id/*), which all live outside
 * /w/[slug]. 'personal' for a personal form, the owning workspace's slug otherwise, and
 * `undefined` while still resolving — callers must not fire scoped requests until it is set,
 * or a workspace form gets queried under 'personal' and the backend rejects it.
 * Same lookup PersonalShell uses (shared query keys, so no extra fetches).
 */
export function useFormScope(formId: string): string | undefined {
  const hint = useSearchParams().get('ws');
  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsService.getFormById(formId),
    enabled: !!formId,
  });
  const { data: workspaces } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: !hint && !!form?.workspaceId,
  });
  if (hint) return hint;
  if (!form) return undefined;
  if (!form.workspaceId) return 'personal';
  if (!workspaces) return undefined; // still finding out which workspaces I belong to
  // A workspace I am not a member of: the form reached me through a per-form share (the grant opens that one form), which works in the
  // personal context. Returning nothing here left the page on its loading skeleton for ever.
  return workspaces.find((w) => w.id === form.workspaceId)?.slug ?? 'personal';
}
