'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilLine } from 'lucide-react';
import { responsesService } from '@/services/responses';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/formatters';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';

// Sprint 13 (A5.2), wireframe 12's reserved slot. Shown only when the respondent edited a response AFTER a
// reviewer had already looked at it. "Mark as reviewed" clears the flag (responses:write — the server decides).
export interface EditedAfterReviewCalloutProps {
  responseId: string;
  editedAt: string;
  scope: string;
  canAct: boolean;
}

export function EditedAfterReviewCallout({ responseId, editedAt, scope, canAct }: EditedAfterReviewCalloutProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const clear = useMutation({
    mutationFn: () => responsesService.clearEditedAfterReview(responseId, scope),
    onSuccess: () => {
      toast('Marked as reviewed', 'success');
      void queryClient.invalidateQueries({ queryKey: ['responses'] });
    },
    onError: (err) => toast(getFriendlyErrorMessage(err), 'error'),
  });

  return (
    <div role="status" className="flex flex-wrap items-center gap-2 rounded-md border border-(--warning-border) bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--text-secondary)">
      <PencilLine size={14} className="shrink-0 text-(--warning-text)" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <strong>Edited after review</strong> — the respondent changed their answers {formatRelativeTime(editedAt)}.
      </span>
      {canAct && (
        <Button type="button" size="small" variant="secondary" className="min-h-11" onClick={() => clear.mutate()} isLoading={clear.isPending}>
          Mark as reviewed
        </Button>
      )}
    </div>
  );
}
