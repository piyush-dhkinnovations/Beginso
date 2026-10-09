import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { formsService } from '@/services/forms';
import { workspacesService } from '@/services/workspaces';
import { workspaceKeys } from '@/lib/queryKeys';
import { useBuilderStore } from '@/store/builderStore';
import { useToast } from '@/components/ui/Toast';
import { hasCapability } from '@/lib/roles';

// Loads the form + its workspace context, derives the builder's destinations/role, and seeds builderStore.
export function useBuilderForm(id: string) {
  const router = useRouter();
  const { toast } = useToast();
  const initForm = useBuilderStore((state) => state.initForm);

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', id],
    queryFn: () => formsService.getFormById(id),
    retry: false,
  });

  // Same lookup PersonalShell's sidebar already does (shares its cache, same query keys) — a
  // workspace-owned form's "back"/leave/delete destinations should return to that workspace's
  // own Forms list, not Personal space's, same reasoning as the sidebar context fix.
  const { data: workspaces = [] } = useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: workspacesService.list,
    enabled: !!form?.workspaceId,
  });
  const formWorkspaceSlug = form?.workspaceId
    ? workspaces.find((ws) => ws.id === form.workspaceId)?.slug
    : undefined;
  const formsListHref = formWorkspaceSlug ? `/w/${formWorkspaceSlug}/forms` : '/forms';
  // The header's back arrow returns to the form's own Overview (where the user came from), carrying the workspace hint.
  const overviewHref = `/forms/${id}/overview${formWorkspaceSlug ? `?ws=${formWorkspaceSlug}` : ''}`;
  // Personal form → the caller is its owner; workspace form → their membership role (unknown = no link).
  const formRole = form?.myRole ?? (form?.workspaceId ? workspaces.find((ws) => ws.id === form.workspaceId)?.role : 'owner');

  const formWorkspace = workspaces.find((ws) => ws.slug === formWorkspaceSlug);

  // A role that cannot edit has no business in the builder (the server rejects its writes anyway): send it to the read-only Overview.
  useEffect(() => {
    if (form?.myRole && !hasCapability(form.myRole, 'forms:edit')) router.replace(`/forms/${id}/overview`);
  }, [form?.myRole, id, router]);

  // Init builderStore state when query returns data. Guarded to run once per
  // form id — not on every query-cache update. Publish/close success handlers
  // call queryClient.setQueryData to patch status/slug into the cache, which
  // creates a new `form` object reference; without this guard that re-triggers
  // initForm() with the STALE data those handlers spread from (the original
  // GET response, never refreshed after autosave PATCHes), wiping out any
  // fields added since the form was first loaded.
  const initializedFormId = useRef<string | null>(null);
  useEffect(() => {
    if (form && initializedFormId.current !== form._id) {
      initializedFormId.current = form._id;
      initForm(form);
    }
  }, [form, initForm]);

  const hasRedirected = useRef(false);

  useEffect(() => {
    if (error && !hasRedirected.current) {
      hasRedirected.current = true;
      toast('Form not found or access denied', 'error');
      router.push(formsListHref);
    }
  }, [error, router, toast, formsListHref]);

  return { form, isLoading, formWorkspaceSlug, formWorkspace, formsListHref, overviewHref, formRole };
}
