import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { TrashItem, TrashItemType, TrashListResponse } from '@/types/trash';

// Sprint 13 (CF5.5), design.md §12. `scope` is a workspace slug, or 'personal'. The backend computes
// `daysLeft`, `purgeAt`, `canRestore` and `canPurge` — the UI renders them and never re-derives roles or the
// 30-day clock. Permanent deletion requires the literal confirmation, which the server checks as well.
export const trashService = {
  list: (
    scope: string,
    params: { type?: TrashItemType; page?: number; limit?: number } = {}
  ): Promise<TrashListResponse> =>
    axiosInstance
      .get('/api/trash', { params, headers: workspaceHeaders(scope) })
      .then((r) => {
        const body = (r.data ?? {}) as Partial<TrashListResponse>;
        return {
          items: Array.isArray(body.items) ? (body.items as TrashItem[]) : [],
          total: typeof body.total === 'number' ? body.total : 0,
          page: typeof body.page === 'number' ? body.page : params.page ?? 1,
          limit: typeof body.limit === 'number' ? body.limit : params.limit ?? 25,
          storageBytes: typeof body.storageBytes === 'number' ? body.storageBytes : 0,
        };
      }),

  restore: (scope: string, type: TrashItemType, id: string) =>
    axiosInstance.post(`/api/trash/${type}/${id}/restore`, {}, { headers: workspaceHeaders(scope) }).then(() => undefined),

  purge: (scope: string, type: TrashItemType, id: string) =>
    axiosInstance
      .delete(`/api/trash/${type}/${id}`, { data: { confirm: 'DELETE' }, headers: workspaceHeaders(scope) })
      .then(() => undefined),

  empty: (scope: string) =>
    axiosInstance
      .delete<{ forms?: number; responses?: number }>('/api/trash', { data: { confirm: 'DELETE' }, headers: workspaceHeaders(scope) })
      .then((r) => ({ forms: r.data?.forms ?? 0, responses: r.data?.responses ?? 0 })),
};
