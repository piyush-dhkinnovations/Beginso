import { useQuery } from '@tanstack/react-query';
import { responsesService } from '@/services/responses';
import { textFields } from '@/lib/answerText';
import type { FormField } from '@/types/form';
import type { IResponse } from '@/types/response';
import type { StageRef } from '@/types/stage';

const COUNT = 4;

/** Made-up responses for a form that has none yet, so the preview still shows how the table and the card will look. */
export function sampleResponses(formId: string, fields: readonly FormField[] | undefined, stage: StageRef | undefined): IResponse[] {
  const names = ['Asha Rao', 'Ben Cole', 'Chitra Nair', 'Dev Shah'];
  const now = Date.now();
  return names.slice(0, COUNT).map((name, i) => {
    const answers: Record<string, string> = {};
    for (const f of textFields(fields)) answers[f.label] = f.type === 'email' ? `${name.split(' ')[0].toLowerCase()}@example.com` : /name/i.test(f.label) ? name : `Sample answer ${i + 1}`;
    const when = new Date(now - i * 86_400_000).toISOString();
    return {
      _id: `sample-${i}`,
      formId,
      reference: `KA-FIL-${String(COUNT - i).padStart(4, '0')}`,
      answers,
      respondentEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
      stage: stage ?? null,
      assignee: null,
      tags: [],
      noteCount: 0,
      unread: i === 0,
      duplicateOfId: null,
      submittedAt: when,
      createdAt: when,
      updatedAt: when,
    } as IResponse;
  });
}

/** The form's latest responses (or made-up ones), for the previews in Customize. `isSample` says which. */
export function usePreviewResponses(opts: { scope: string; formId: string; fields: readonly FormField[] | undefined; stage: StageRef | undefined; enabled: boolean }) {
  const { scope, formId, fields, stage, enabled } = opts;
  const { data, isLoading } = useQuery({
    queryKey: ['response-setup-preview', scope, formId],
    queryFn: () => responsesService.getResponses({ formId, page: 1, limit: COUNT }, scope),
    enabled,
    staleTime: 60_000,
  });
  const real = data?.data ?? [];
  const isSample = !isLoading && real.length === 0;
  return { responses: isSample ? sampleResponses(formId, fields, stage) : real, isSample, isLoading };
}
