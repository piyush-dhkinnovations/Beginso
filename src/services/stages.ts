import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { Stage, StageColorToken, StageCategory } from '@/types/stage';

/**
 * BE 0.1 — new infrastructure, not yet built (design.md §11.2). Built against the documented
 * contract; the backend developer owns final field naming ("Backend contract to confirm").
 * Envelope unwrapped defensively (design.md §12's own instruction) since nothing here has been
 * exercised against a live response yet.
 */
export interface StagePayload {
  name: string;
  colour: StageColorToken;
  category: StageCategory;
}

export const stagesService = {
  list: (scope: string): Promise<Stage[]> =>
    axiosInstance
      .get(`/api/workspaces/${scope}/stages`, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Stage[]>(r.data, 'stages'))
      .then((stages) => (Array.isArray(stages) ? stages : [])),

  create: (scope: string, payload: StagePayload): Promise<Stage> =>
    axiosInstance
      .post(`/api/workspaces/${scope}/stages`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Stage>(r.data, 'stage')),

  update: (scope: string, stageId: string, payload: Partial<StagePayload>): Promise<Stage> =>
    axiosInstance
      .patch(`/api/workspaces/${scope}/stages/${stageId}`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Stage>(r.data, 'stage')),

  // `reassignTo` is required by the contract whenever the stage being deleted still holds
  // responses (design.md §11.2) — the UI must have already resolved that before calling this.
  remove: (scope: string, stageId: string, reassignTo?: string): Promise<void> =>
    axiosInstance
      .delete(`/api/workspaces/${scope}/stages/${stageId}`, {
        headers: workspaceHeaders(scope),
        data: reassignTo ? { reassignTo } : undefined,
      })
      .then(() => undefined),

  reorder: (scope: string, orderedIds: string[]): Promise<void> =>
    axiosInstance
      .patch(`/api/workspaces/${scope}/stages/order`, { orderedIds }, { headers: workspaceHeaders(scope) })
      .then(() => undefined),
};
