import { useQuery } from '@tanstack/react-query';
import { useStages } from '@/hooks/useStages';
import { responseSetupService } from '@/services/responseSetup';
import { responseSetupKeys } from '@/lib/queryKeys';
import { isStageColorToken, type StageRef } from '@/types/stage';
import { DEFAULT_RESPONSE_SETUP, type ResponseSetup, type ResponseSetupValues } from '@/types/responseSetup';

/** How one form's Responses page is set up. Undefined while loading, and when no form is named (the all-forms views). */
export function useResponseSetup(formId?: string) {
  return useQuery({
    queryKey: responseSetupKeys.form(formId ?? ''),
    queryFn: () => responseSetupService.get(formId as string),
    enabled: !!formId,
    staleTime: 60_000,
  });
}

/** The setup values to use right now: the form's, or the defaults (while loading, or on a page about no particular form). */
export function setupValues(setup: ResponseSetup | undefined): ResponseSetupValues {
  return setup?.setup ?? DEFAULT_RESPONSE_SETUP;
}

/**
 * The stages a form's responses are filed under: its own when it has any, else the workspace's. For the all-forms views (no form)
 * and for personal forms this is the workspace's stages, as before.
 */
export function useFormStages(scope: string | undefined, formId?: string) {
  const workspace = useStages(scope);
  const setup = useResponseSetup(formId);
  const own = setup.data?.stages.mode === 'own' ? setup.data.stages.list : undefined;
  const stages: readonly StageRef[] | undefined = own
    ? own.map((s) => ({ id: s.id, name: s.name, colour: isStageColorToken(s.colour) ? s.colour : 'neutral', category: s.category }))
    : workspace.data;
  return { stages, isLoading: workspace.isLoading || (!!formId && setup.isLoading) };
}
