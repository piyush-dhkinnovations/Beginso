'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/common/Toast';
import { responsesService, type UpdateResponsePayload } from '@/services/responses';
import { responseKeys } from '@/lib/queryKeys';
import { runSequentially } from '@/lib/responseList';
import type { IResponse, PaginatedResponsesResult } from '@/types/response';

export interface UseInboxMutationsOptions {
  /** Workspace slug, or 'personal'. */
  scope: string;
  formId?: string;
}

/**
 * Sprint 12 (inbox-collaboration), design.md §7 "useInboxMutations" (task 1.8): "every write
 * (stage, assign, tag, read, bulk, delete) with optimistic update, rollback and cache
 * invalidation." This first pass covers single-response stage/assignee/tag writes and a
 * sequential bulk stage/delete (still via `runSequentially`, matching the current bulk bar's
 * behaviour) — the one-request bulk endpoint, undo handle and mark-read are Phase 2 (task 2.3),
 * per `POST /api/responses/bulk` (BE 0.2) not existing yet.
 */
export function useInboxMutations({ scope, formId }: UseInboxMutationsOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const listKey = responseKeys.all(scope, formId);

  function patchListCaches(ids: readonly string[], patch: Partial<IResponse>) {
    queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
      old && Array.isArray(old.data)
        ? { ...old, data: old.data.map((r) => (ids.includes(r._id) ? { ...r, ...patch } : r)) }
        : old
    );
  }

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
      patchListCaches([id], optimisticPatch);
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
      patchListCaches([updated._id], updated);
      queryClient.setQueryData<IResponse>(responseKeys.detail(scope, updated._id), (old) =>
        old ? { ...old, ...updated } : old
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const bulkStageMutation = useMutation({
    mutationFn: async ({ ids, stageId }: { ids: string[]; stageId: string }) => {
      await runSequentially(ids, (id) => responsesService.update(id, { stageId }, scope));
    },
    onMutate: async ({ ids, stageId }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData<PaginatedResponsesResult>({ queryKey: listKey });
      queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((r) =>
                ids.includes(r._id) ? { ...r, stage: { ...r.stage, id: stageId } } : r
              ),
            }
          : old
      );
      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast('Failed to update responses. Please try again.', 'error');
    },
    onSuccess: (_data, { ids }) => toast(`${ids.length} response${ids.length === 1 ? '' : 's'} updated.`, 'success'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await runSequentially(ids, (id) => responsesService.deleteResponse(id, scope));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previousLists = queryClient.getQueriesData<PaginatedResponsesResult>({ queryKey: listKey });
      queryClient.setQueriesData<PaginatedResponsesResult>({ queryKey: listKey }, (old) =>
        old
          ? { ...old, data: old.data.filter((r) => !ids.includes(r._id)), total: Math.max(old.total - ids.length, 0) }
          : old
      );
      return { previousLists };
    },
    onError: (_err, _vars, context) => {
      context?.previousLists?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast('Failed to delete responses. Please try again.', 'error');
    },
    onSuccess: (_data, ids) => toast(`${ids.length} response${ids.length === 1 ? '' : 's'} deleted.`, 'success'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  const singleDeleteMutation = useMutation({
    mutationFn: (id: string) => responsesService.deleteResponse(id, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      toast('Response deleted.', 'success');
    },
    onError: () => toast('Failed to delete response. Please try again.', 'error'),
  });

  return {
    updateStage: (id: string, stageId: string) => updateMutation.mutate({ id, payload: { stageId } }),
    updateAssignee: (id: string, assigneeId: string | null) => updateMutation.mutate({ id, payload: { assigneeId } }),
    updateTags: (id: string, tagIds: string[]) => updateMutation.mutate({ id, payload: { tagIds } }),
    isUpdating: updateMutation.isPending,
    bulkUpdateStage: bulkStageMutation.mutate,
    isBulkUpdatingStage: bulkStageMutation.isPending,
    bulkDelete: bulkDeleteMutation.mutate,
    isBulkDeleting: bulkDeleteMutation.isPending,
    singleDelete: singleDeleteMutation.mutate,
    isSingleDeleting: singleDeleteMutation.isPending,
  };
}
