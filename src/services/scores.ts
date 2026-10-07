import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type {
  ScoreCriterion,
  CriterionPayload,
  ResponseScore,
  ScorePayload,
  GetScoreComparisonParams,
  PaginatedScoreComparison,
} from '@/types/score';

/**
 * BE 0.5 — new infrastructure, not yet built (design.md §11.2, tasks.md 5.2/5.3). Built against
 * the documented contract; the backend developer owns final field naming ("Backend contract to
 * confirm"). Envelope unwrapped defensively (design.md §12's own instruction), same pattern as
 * `stagesService`/`tagsService`.
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

  // Upserts the caller's own row for `payload.criterionId` — never another reviewer's row (B6.1).
  putScore: (responseId: string, payload: ScorePayload): Promise<ResponseScore> =>
    axiosInstance
      .put(`/api/responses/${responseId}/score`, payload)
      .then((r) => unwrapEnvelope<ResponseScore>(r.data, 'score')),

  getComparison: (formId: string, params: GetScoreComparisonParams = {}): Promise<PaginatedScoreComparison> =>
    axiosInstance
      .get(`/api/forms/${formId}/score-comparison`, { params })
      .then((r) => unwrapEnvelope<PaginatedScoreComparison>(r.data, 'comparison'))
      .then((result) => ({
        data: Array.isArray(result?.data) ? result.data : [],
        total: typeof result?.total === 'number' ? result.total : 0,
        page: typeof result?.page === 'number' ? result.page : params.page ?? 1,
        limit: typeof result?.limit === 'number' ? result.limit : 20,
      })),
};
