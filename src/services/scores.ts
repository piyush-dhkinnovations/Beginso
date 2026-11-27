import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type {
  ScoreCriterion,
  CriterionPayload,
  ResponseScore,
  ScorePayload,
} from '@/types/score';

/**
 * Envelope unwrapped defensively, same pattern as `stagesService`/`tagsService`.
 */
export const scoresService = {
  listCriteria: (scope: string): Promise<ScoreCriterion[]> =>
    axiosInstance
      .get(`/api/workspaces/${scope}/score-criteria`, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<ScoreCriterion[]>(r.data, 'criteria'))
      .then((criteria) => (Array.isArray(criteria) ? criteria : [])),

  createCriterion: (scope: string, payload: CriterionPayload): Promise<ScoreCriterion> =>
    axiosInstance
      .post(`/api/workspaces/${scope}/score-criteria`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<ScoreCriterion>(r.data, 'criterion')),

  updateCriterion: (scope: string, criterionId: string, payload: Partial<CriterionPayload>): Promise<ScoreCriterion> =>
    axiosInstance
      .patch(`/api/workspaces/${scope}/score-criteria/${criterionId}`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<ScoreCriterion>(r.data, 'criterion')),

  removeCriterion: (scope: string, criterionId: string): Promise<void> =>
    axiosInstance
      .delete(`/api/workspaces/${scope}/score-criteria/${criterionId}`, { headers: workspaceHeaders(scope) })
      .then(() => undefined),

  reorderCriteria: (scope: string, orderedIds: string[]): Promise<void> =>
    axiosInstance
      .patch(`/api/workspaces/${scope}/score-criteria/order`, { orderedIds }, { headers: workspaceHeaders(scope) })
      .then(() => undefined),

  // Response-scoped — no workspace header needed (the response id already resolves the scope
  // server-side), matching responsesService.getResponseById's own precedent.
  getScore: (responseId: string): Promise<ResponseScore> =>
    axiosInstance
      .get(`/api/responses/${responseId}/score`)
      .then((r) => unwrapEnvelope<ResponseScore>(r.data, 'score')),

  // Upserts the caller's own row for `payload.criterionId` — never another reviewer's row.
  putScore: (responseId: string, payload: ScorePayload): Promise<ResponseScore> =>
    axiosInstance
      .put(`/api/responses/${responseId}/score`, payload)
      .then((r) => unwrapEnvelope<ResponseScore>(r.data, 'score')),

};
