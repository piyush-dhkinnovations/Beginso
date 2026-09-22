import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspacesService } from '@/services/workspaces';
import type { WorkspaceEventItem, AuditFilters } from '@/types/event';

// Real bug found and fixed: a live capture of GET /api/workspaces/:id/audit returned each event
// as `{ ..., actor: { id, name, email }, ... }` — nested, not the flat `actorName: string` this
// type was written against (a pre-backend design guess, per its own "Backend contract to
// confirm" comment, never corrected once a real response existed). `event.actorName` was
// therefore always `undefined`, rendering a blank Actor cell for every row in AuditTable. Mapped
// here, at the trust boundary, into the flat shape every consumer (AuditTable, ActivityFeed,
// FormActivityCard) already expects — same reasoning as toReportJob/toResponseDetail elsewhere
// in this codebase, so no consumer needs to change.
interface RawWorkspaceEvent extends Omit<WorkspaceEventItem, 'actorName'> {
  actorName?: string;
  actor?: { id?: string; name?: string; email?: string };
}

function toEvent(raw: RawWorkspaceEvent): WorkspaceEventItem {
  return { ...raw, actorName: raw.actorName ?? raw.actor?.name ?? raw.actor?.email ?? 'Unknown' };
}

function toEvents(raw: unknown): WorkspaceEventItem[] {
  const unwrapped = unwrapEnvelope<unknown>(raw, 'events');
  return Array.isArray(unwrapped) ? (unwrapped as RawWorkspaceEvent[]).map(toEvent) : [];
}

// `range` is a UI choice (7d/30d/all); the wire format is a `from` timestamp.
function rangeToFrom(range: AuditFilters['range']): string | undefined {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : undefined;
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
}

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

// Real bug found and fixed: every caller of listWorkspaceActivity/listAudit passes the URL
// slug (`/w/[slug]/...` pages only ever have the slug, not the real id), but
// GET /api/workspaces/:id/events|audit needs the real Mongo id in the path — unlike
// GET /api/workspaces/:id itself (resolveWorkspaceBySlug's own confirmed contract note, which
// explicitly accepts either). Sending the slug there 500s ("Server error listing workspace
// activity") instead of the clean 400 the forms-create endpoint gives for the identical mistake.
// Resolved here, once, so every caller keeps passing whichever it already has (slug or id) —
// same reasoning formsService.ts's own x-workspace-slug header fix already established: this
// translation belongs at the trust boundary, not duplicated into every page.
async function resolveWorkspaceId(workspaceIdOrSlug: string): Promise<string> {
  if (OBJECT_ID_RE.test(workspaceIdOrSlug)) return workspaceIdOrSlug;
  const workspace = await workspacesService.get(workspaceIdOrSlug);
  return workspace.id;
}

export const eventsService = {
  listWorkspaceActivity: async (workspaceId: string, page = 1, limit?: number): Promise<WorkspaceEventItem[]> => {
    const id = await resolveWorkspaceId(workspaceId);
    return axiosInstance
      .get(`/api/workspaces/${id}/events`, { params: { page, limit } })
      .then((r) => toEvents(r.data));
  },

  listAudit: async (workspaceId: string, filters: AuditFilters = {}): Promise<WorkspaceEventItem[]> => {
    const id = await resolveWorkspaceId(workspaceId);
    return axiosInstance
      .get(`/api/workspaces/${id}/audit`, {
        params: {
          page: filters.page ?? 1,
          limit: filters.limit,
          actorId: filters.actorId,
          from: rangeToFrom(filters.range),
        },
      })
      .then((r) => toEvents(r.data));
  },

  listFormEvents: (formId: string, page = 1, limit?: number): Promise<WorkspaceEventItem[]> =>
    axiosInstance.get(`/api/forms/${formId}/events`, { params: { page, limit } }).then((r) => toEvents(r.data)),
};
