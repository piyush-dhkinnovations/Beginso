'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { scoresService } from '@/services/scores';
import { scoreKeys } from '@/lib/queryKeys';
import type { ScoreCriterion, ResponseScore } from '@/types/score';

const STARS = [1, 2, 3, 4, 5];

/**
 * 5 stars, half-star precision — the underlying value is still the full 1-10 scale (B6.1's
 * resolved decision, unchanged), each star just represents 2 points. Left half of a star sets the
 * odd value, right half sets the even value, same as any half-star rating widget.
 */
function StarRating({
  value,
  disabled,
  onChange,
}: {
  value: number | undefined;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-0.5" role="radiogroup">
      {STARS.map((star) => {
        const evenValue = star * 2;
        const oddValue = evenValue - 1;
        const fill = value === undefined ? 0 : value >= evenValue ? 1 : value >= oddValue ? 0.5 : 0;
        return (
          <span key={star} className="relative inline-flex">
            <Star size={22} strokeWidth={1.5} className="text-(--border-default)" aria-hidden="true" />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: fill === 1 ? '100%' : '50%' }}
                aria-hidden="true"
              >
                <Star size={22} strokeWidth={1.5} className="fill-(--action-primary) text-(--action-primary)" />
              </span>
            )}
            <button
              type="button"
              role="radio"
              aria-checked={value === oddValue}
              aria-label={`${oddValue} out of 10`}
              disabled={disabled}
              onClick={() => onChange(oddValue)}
              className="absolute inset-y-0 left-0 w-1/2 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              role="radio"
              aria-checked={value === evenValue}
              aria-label={`${evenValue} out of 10`}
              disabled={disabled}
              onClick={() => onChange(evenValue)}
              className="absolute inset-y-0 right-0 w-1/2 disabled:cursor-not-allowed"
            />
          </span>
        );
      })}
    </div>
  );
}

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
        const base: ResponseScore = { responseId, scoreAverage: null, scoreCount: 0, ...old };
        const ownEntries = base.entries ?? [];
        const hadOwnEntry = ownEntries.some((e) => e.criterionId === criterionId);
        const nextEntries = hadOwnEntry
          ? ownEntries.map((e) => (e.criterionId === criterionId ? { ...e, value } : e))
          : [...ownEntries, { criterionId, value }];
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
    return <p className="bg-body-sm text-(--text-muted)">No scoring criteria configured for this workspace.</p>;
  }

  const ownValue = (criterionId: string) => score?.entries?.find((e) => e.criterionId === criterionId)?.value;

  return (
    // Bordered box matching Stage/Assignee/Tags above it — was floating with no container before.
    <div className="flex flex-col gap-4 rounded-md border border-(--border-default) bg-(--bg-subtle) p-2.5">
      {criteria.map((criterion) => {
        const own = ownValue(criterion.id);
        return (
          <fieldset key={criterion.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="bg-body-sm font-semibold text-(--text-primary)">
                {criterion.label || (criterion.isDefault ? 'Overall score' : 'Unnamed criterion')}
              </legend>
              {own !== undefined && (
                <span className="shrink-0 rounded-md bg-(--accent-soft) px-2 py-0.5 bg-caption font-medium text-(--accent-soft-text)">
                  {own}/10
                </span>
              )}
            </div>

            <StarRating
              value={own}
              disabled={disabled || submitMutation.isPending}
              onChange={(value) => submitMutation.mutate({ criterionId: criterion.id, value })}
            />
          </fieldset>
        );
      })}

      <p className="bg-body-sm text-(--text-muted)">
        {score && score.scoreAverage !== null
          ? `${score.scoreAverage.toFixed(1)} (${score.scoreCount} reviewer${score.scoreCount === 1 ? '' : 's'})`
          : 'No scores yet'}
      </p>
    </div>
  );
}
