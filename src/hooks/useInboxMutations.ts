'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { responsesService, type UpdateResponsePayload } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { idsRemainingSelected } from '@/lib/bulkActions';
import type {
  IResponse,
  PaginatedResponsesResult,
  BulkAction,
  BulkTarget,
  BulkResult,
  BulkPrevious,
} from '@/types/response';

export interface UseInboxMutationsOptions {
  /** Workspace slug, or 'personal'. */
  scope: string;
  formId?: string;
}

export interface BulkOptions {
  /** Ids actually attempted — defaults to `target.ids` when the target is an id list. Needed
   * explicitly for a `filter` target (Select all N matching), where the caller knows the total
   * even though this hook cannot see individual ids. */
  attemptedIds?: string[];
  onSuccess?: (result: BulkResult) => void;
  onSettled?: () => void;
}

function describeBulkAction(action: BulkAction, count: number): string {
  const noun = `response${count === 1 ? '' : 's'}`;
  switch (action.type) {
    case 'stage':
      return `${count} ${noun} moved.`;
    case 'assign':
      return `${count} ${noun} ${action.assigneeId === null ? 'unassigned' : 'reassigned'}.`;
    case 'tag':
      return `Tag added to ${count} ${noun}.`;
    case 'untag':
      return `Tag removed from ${count} ${noun}.`;
    case 'read':
      return `${count} ${noun} marked read.`;
    case 'unread':
      return `${count} ${noun} marked unread.`;
    case 'delete':
      return `${count} ${noun} deleted.`;
    case 'restore':
      return `${count} ${noun} restored.`;
  }
}

// Every bulk action except `restore` itself can be undone by posting its `previous` snapshot
// back as one `restore` request (design.md §8). OQ-3 is resolved in favour of reversible delete
// now that BE 0.2 is building soft delete against this exact contract (task 2.4's own brief) —
// so `delete` is reversible here too, not a special case.
function isReversible(action: BulkAction): boolean {
  return action.type !== 'restore';
}

/**
 * Sprint 12 (inbox-collaboration), design.md §7 "useInboxMutations" (task 2.3): "every write
 * (stage, assign, tag, read, bulk, delete) with optimistic update, rollback and cache
 * invalidation." Retires `runSequentially` for bulk — `bulk()` is always one request
 * (`POST /api/responses/bulk`), whether the target is an explicit id list or a filter ("Select
 * all N matching", requirements.md §7.2). Every mutation patches both the list cache(s) and the
 * matching detail cache entry so a change made in one view is visible in the others without a
 * refetch (design.md §8).
 */
export function useInboxMutations({ scope, formId }: UseInboxMutationsOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const listKey = responseKeys.all(scope, formId);

  function patchListCaches(ids: readonly string[], patch: (r: IResponse) => Partial<IResponse>) {
    queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
      old && Array.isArray(old.data)
        ? { ...old, data: old.data.map((r) => (ids.includes(r._id) ? { ...r, ...patch(r) } : r)) }
        : old
    );
  }

  function patchDetailCaches(ids: readonly string[], patch: (r: IResponse) => Partial<IResponse>) {
    ids.forEach((id) => {
      const key = responseKeys.detail(scope, id);
      queryClient.setQueryData<IResponse>(key, (old) => (old ? { ...old, ...patch(old) } : old));
    });
  }

  // ---- single-response writes (stage / assignee / tags) ----
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateResponsePayload }) =>
      responsesService.update(id, payload, scope),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData<PaginatedResponsesResult>({ queryKey: listKey });
      const detailKey = responseKeys.detail(scope, id);
      const previousDetail = queryClient.getQueryData<IResponse>(detailKey);

      const optimisticPatch: Partial<IResponse> = {};
      if (payload.assigneeId === null) optimisticPatch.assignee = null;
      patchListCaches([id], () => optimisticPatch);
      if (Object.keys(optimisticPatch).length > 0) {
        queryClient.setQueryData<IResponse>(detailKey, (old) => (old ? { ...old, ...optimisticPatch } : old));
      }

      return { previousLists, previousDetail, detailKey };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context) queryClient.setQueryData(context.detailKey, context.previousDetail);
      toast('Failed to update the response. Please try again.', 'error');
    },
    onSuccess: (updated) => {
      patchListCaches([updated._id], () => updated);
      queryClient.setQueryData<IResponse>(responseKeys.detail(scope, updated._id), (old) =>
        old ? { ...old, ...updated } : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  // ---- per-user read state (task 2.3 — new) ----
  const markReadMutation = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => responsesService.markRead(id, read, scope),
    onMutate: async ({ id, read }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData<PaginatedResponsesResult>({ queryKey: listKey });
      const detailKey = responseKeys.detail(scope, id);
      const previousDetail = queryClient.getQueryData<IResponse>(detailKey);
      patchListCaches([id], () => ({ unread: !read }));
      queryClient.setQueryData<IResponse>(detailKey, (old) => (old ? { ...old, unread: !read } : old));
      return { previousLists, previousDetail, detailKey };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (context) queryClient.setQueryData(context.detailKey, context.previousDetail);
      toast('Failed to update read state. Please try again.', 'error');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  // ---- bulk (task 2.3 — one request; retires runSequentially) ----
  function optimisticBulkPatch(action: BulkAction): ((r: IResponse) => Partial<IResponse>) | undefined {
    switch (action.type) {
      case 'stage':
        // r.stage is null for an unmigrated response (no stageId yet) — nothing to optimistically
        // patch onto in that case; the real stage arrives on refetch/success instead.
        return (r) => (r.stage ? { stage: { ...r.stage, id: action.stageId } } : {});
      case 'assign':
        return action.assigneeId === null ? () => ({ assignee: null }) : undefined;
      case 'read':
        return () => ({ unread: false });
      case 'unread':
        return () => ({ unread: true });
      default:
        return undefined;
    }
  }

  const bulkMutation = useMutation({
    mutationFn: ({ target, action, previous }: { target: BulkTarget; action: BulkAction; previous?: BulkPrevious[] }) =>
      responsesService.bulk({ target, action, previous }, scope),
    onMutate: async ({ target, action }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData<PaginatedResponsesResult>({ queryKey: listKey });

      if ('ids' in target) {
        if (action.type === 'delete') {
          queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
            old
              ? { ...old, data: old.data.filter((r) => !target.ids.includes(r._id)), total: Math.max(old.total - target.ids.length, 0) }
              : old
          );
        } else {
          const patch = optimisticBulkPatch(action);
          if (patch) {
            patchListCaches(target.ids, patch);
            patchDetailCaches(target.ids, patch);
          }
        }
      }
      // A `filter` target (Select all N matching) touches ids the client doesn't have loaded —
      // no optimistic patch is attempted; onSettled's invalidate is the only update.

      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast('Failed to update responses. Please try again.', 'error');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  /** One request per bulk action, for an id list or a filter (requirements.md §7.2/§7.5). */
  function bulk(target: BulkTarget, action: BulkAction, options?: BulkOptions) {
    bulkMutation.mutate(
      { target, action },
      {
        onSuccess: (result) => {
          const attempted = options?.attemptedIds ?? ('ids' in target ? target.ids : []);
          const failedCount = result.failed.length;
          const message =
            failedCount > 0 && attempted.length > 0
              ? `${result.succeeded.length} of ${attempted.length} updated, ${failedCount} failed.`
              : describeBulkAction(action, result.succeeded.length);

          if (isReversible(action) && result.previous.length > 0) {
            toast(message, failedCount > 0 ? 'warning' : 'success', undefined, {
              label: 'Undo',
              onClick: () => undo(result.previous),
            });
          } else {
            toast(message, failedCount > 0 ? 'warning' : 'success');
          }
          options?.onSuccess?.(result);
        },
        onSettled: options?.onSettled,
      }
    );
  }

  /** Undo: one `restore` request carrying the `previous` snapshot (design.md §8) — never one
   * request per id. */
  function undo(previous: BulkPrevious[]) {
    bulkMutation.mutate(
      { target: { ids: previous.map((p) => p.id) }, action: { type: 'restore' }, previous },
      { onSuccess: () => toast('Undone.', 'success') }
    );
  }

  // ---- single delete (existing confirm-modal flow, unchanged endpoint) ----
  const singleDeleteMutation = useMutation({
    mutationFn: (id: string) => responsesService.deleteResponse(id, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast('Response deleted.', 'success');
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
  });

  return {
    // Personal shell (OQ-9 fixed defaults): `stageId` here is one of PERSONAL_DEFAULT_STAGES'
    // synthetic ids ('new'/'in_progress'/'completed'), not a real Stage document — sent as
    // `status` instead, which is exactly what those ids already are.
    updateStage: (id: string, stageId: string) =>
      updateMutation.mutate({
        id,
        payload: scope === 'personal' ? { status: stageId as 'new' | 'in_progress' | 'completed' } : { stageId },
      }),
    updateAssignee: (id: string, assigneeId: string | null) => updateMutation.mutate({ id, payload: { assigneeId } }),
    updateTags: (id: string, tagIds: string[]) => updateMutation.mutate({ id, payload: { tagIds } }),
    isUpdating: updateMutation.isPending,

    markRead: (id: string, read: boolean) => markReadMutation.mutate({ id, read }),
    isMarkingRead: markReadMutation.isPending,

    bulk,
    isBulkRunning: bulkMutation.isPending,

    singleDelete: singleDeleteMutation.mutate,
    isSingleDeleting: singleDeleteMutation.isPending,
  };
}

// Exported for the bulk selection UI (BulkActionBar, task 2.4) to compute which ids should stay
// selected after a partial-failure bulk response, without duplicating the rule.
export { idsRemainingSelected };
