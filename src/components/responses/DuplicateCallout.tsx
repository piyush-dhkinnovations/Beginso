'use client';

import { useQuery } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { responsesService } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { shortId } from '@/lib/formatters';

export interface DuplicateCalloutProps {
  duplicateOfId: string;
  scope: string;
  /** Navigates to the original response — the caller already owns "open a response by id"
   * (drawer position/select handlers), so this doesn't reinvent that routing. */
  onOpenOriginal: (id: string) => void;
}

/**
 * Sprint 12 (inbox-collaboration), requirements.md §11.1, task 5.5. Shown in `WorkflowSidebar`
 * only when `response.duplicateOfId` is set. The API doesn't return the original's `#reference`
 * inline (design.md §13 "uncertain field"), so this does the same single-response lookup
 * `ResponseDrawer` already does for the response itself, keyed so it shares cache with any other
 * view of that same original.
 */
export function DuplicateCallout({ duplicateOfId, scope, onOpenOriginal }: DuplicateCalloutProps) {
  const { data: original } = useQuery({
    queryKey: responseKeys.detail(scope, duplicateOfId),
    queryFn: () => responsesService.getResponseById(duplicateOfId, scope),
  });

  const label = original ? `#${original.reference ?? shortId(original._id)}` : `#${shortId(duplicateOfId)}`;

  return (
    <div className="flex items-center gap-2 rounded-md border border-(--warning-border) bg-(--warning-surface) px-3 py-2 bg-body-sm text-(--text-secondary)">
      <Copy size={14} className="shrink-0 text-(--text-muted)" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        Possible duplicate of{' '}
        <button
          type="button"
          onClick={() => onOpenOriginal(duplicateOfId)}
          className="font-medium text-(--action-primary) underline underline-offset-2 hover:no-underline"
        >
          {label}
        </button>
      </span>
    </div>
  );
}
