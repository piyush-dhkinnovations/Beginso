import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { WorkspaceEventItem, AuditFilters } from '@/types/event';

// Backend contract to confirm (BE 0.3–0.5) — none of these routes is verified against a live
// backend; the envelope key is a guess, so every method guards the non-array case at this trust
// boundary (the `shares.map is not a function` crash, sharedService's own comment) instead of in
// every consumer.
function toEvents(raw: unknown): WorkspaceEventItem[] {
  const unwrapped = unwrapEnvelope<unknown>(raw, 'events');
  return Array.isArray(unwrapped) ? (unwrapped as WorkspaceEventItem[]) : [];
}

// `range` is a UI choice (7d/30d/all); the wire format is a `from` timestamp.
function rangeToFrom(range: AuditFilters['range']): string | undefined {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : undefined;
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
}

export const eventsService = {
  listWorkspaceActivity: (workspaceId: string, page = 1, limit?: number): Promise<WorkspaceEventItem[]> =>
    axiosInstance
      .get(`/api/workspaces/${workspaceId}/events`, { params: { page, limit } })
      .then((r) => toEvents(r.data)),

  listAudit: (workspaceId: string, filters: AuditFilters = {}): Promise<WorkspaceEventItem[]> =>
    axiosInstance
      .get(`/api/workspaces/${workspaceId}/audit`, {
        params: { page: filters.page ?? 1, actorId: filters.actorId, from: rangeToFrom(filters.range) },
      })
      .then((r) => toEvents(r.data)),

  listFormEvents: (formId: string, page = 1, limit?: number): Promise<WorkspaceEventItem[]> =>
    axiosInstance.get(`/api/forms/${formId}/events`, { params: { page, limit } }).then((r) => toEvents(r.data)),
};
