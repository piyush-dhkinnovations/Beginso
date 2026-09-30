'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Radio } from '@/components/ui/Radio';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/common/Toast';
import { scoresService } from '@/services/scores';
import { scoreKeys } from '@/lib/queryKeys';
import type { ScoreCriterion, ResponseScore } from '@/types/score';

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export interface ScoreCardProps {
  responseId: string;
  criteria: readonly ScoreCriterion[];
  /** Owner/Admin-only manage link disabled; scoring itself is `responses:act` (B6.1). */
  disabled?: boolean;
}

/**
 * Sprint 12 (inbox-collaboration), tasks.md 5.2/5.3 — OQ-7 resolved 3 Oct 2026. The caller's own
 * editable per-criterion rows (1-10 `ui/Radio` scale, design.md §15's own pick over a stepper for
 * a small fixed range) plus a read-only aggregate line ("7.4 (3 reviewers)", requirements.md
 * §B6.1). Submitting a criterion optimistically patches only that criterion's row and recomputes
 * the average from the caller's own updated rows — the real reviewer-pooled average still arrives
 * from `onSettled`'s refetch, matching `useInboxMutations`'s own onMutate/onError/onSettled shape.
 */
export function ScoreCard({ responseId, criteria, disabled }: ScoreCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const detailKey = scoreKeys.detail(responseId);

  const { data: score, isLoading } = useQuery({
    queryKey: detailKey,
    queryFn: () => scoresService.getScore(responseId),
    enabled: !!responseId,
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { criterionId: string; value: number }) => scoresService.putScore(responseId, payload),
    onMutate: async ({ criterionId, value }) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<ResponseScore>(detailKey);

      queryClient.setQueryData<ResponseScore>(detailKey, (old) => {
        const base: ResponseScore = old ?? { responseId, entries: [], scoreAverage: null, scoreCount: 0 };
        const hadOwnEntry = base.entries.some((e) => e.criterionId === criterionId);
        const nextEntries = hadOwnEntry
          ? base.entries.map((e) => (e.criterionId === criterionId ? { ...e, value } : e))
          : [...base.entries, { criterionId, value }];
        // Optimistic-only nudge to the displayed average using the caller's own rows — the real
        // all-reviewers average is authoritative only once onSettled's refetch lands.
        const ownAverage = nextEntries.reduce((sum, e) => sum + e.value, 0) / nextEntries.length;
        return {
          ...base,
          entries: nextEntries,
          scoreAverage: base.scoreCount > 0 ? base.scoreAverage : ownAverage,
          scoreCount: hadOwnEntry ? base.scoreCount : base.scoreCount + 1,
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) queryClient.setQueryData(detailKey, context.previous);
      toast('Failed to save score. Please try again.', 'error');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (criteria.length === 0) {
    return <p className="text-body-sm text-(--text-muted)">No scoring criteria configured for this workspace.</p>;
  }

  const ownValue = (criterionId: string) => score?.entries.find((e) => e.criterionId === criterionId)?.value;

  return (
    <div className="flex flex-col gap-4">
      {criteria.map((criterion) => (
        <fieldset key={criterion.id} className="flex flex-col gap-1.5">
          <legend className="text-caption text-(--text-secondary)">{criterion.label || 'Unnamed criterion'}</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={criterion.label || 'Unnamed criterion'}>
            {SCALE.map((value) => (
              <Radio
                key={value}
                id={`score-${responseId}-${criterion.id}-${value}`}
                name={`score-${responseId}-${criterion.id}`}
                label={String(value)}
                checked={ownValue(criterion.id) === value}
                disabled={disabled || submitMutation.isPending}
                onChange={() => submitMutation.mutate({ criterionId: criterion.id, value })}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <p className="text-body-sm text-(--text-muted)">
        {score && score.scoreAverage !== null
          ? `${score.scoreAverage.toFixed(1)} (${score.scoreCount} reviewer${score.scoreCount === 1 ? '' : 's'})`
          : 'No scores yet'}
      </p>
    </div>
  );
}
