import type { GetResponsesParams } from '@/types/response';
import type { FormsContext } from '@/types/workspace';

// sprint-11-v2a-hardening, requirements.md §7.3 (2.6) — query-key audit, classified per
// design.md §10. Every factory below falls into one of three buckets:
//
// (a) Workspace-namespaced: workspaceKeys.forms() (context is a key segment), teamKeys,
//     activityKeys, auditKeys — all namespaced from creation; regression tests proving
//     key('a') !== key('b') live in __tests__/lib/queryKeys.test.ts.
// (b) Namespaced by something else that is itself globally unique or per-caller, so a workspace
//     segment would be redundant: formKeys/formEventKeys/formAccessKeys (by formId — a Mongo
//     ObjectId, globally unique across every workspace and personal space, so no two forms in
//     different contexts can ever collide on this key); invitationKeys (by token); sharedKeys,
//     notificationKeys, settingsKeys.profile()/sessions() (per-user by nature — scoped to the
//     caller's own session, not any workspace).
// (c) Workspace-scoped data read with NO workspace in the key at all: responseKeys, dashboardKeys,
//     analyticsKeys, reportKeys, settingsKeys.workspace(). Every one of these renders only under
//     the personal (user) shell — no /w/[slug]/responses|analytics|reports|dashboard route
//     exists — so a *cache* bleed across a context switch cannot happen (nothing here can ever be
//     mounted twice with two different contexts competing for the same key). But of every service
//     call in this codebase, only formsService.getForms() sends x-workspace-slug
//     (src/services/forms.ts) — these calls send no workspace indicator at all, so the backend
//     resolves one by its own fallback order (API_CONTRACT.md "Workspace Resolution"), the same
//     fallback that caused the 16 Sep forms leak. **Backend contract to confirm:** do these
//     personal-shell pages actually receive personal-scoped data, or the caller's default
//     workspace's data? Unproven from this checkout — a confirmed leak here is a wrong-data risk,
//     release-blocking per design.md §10, not a stale-cache bug this key structure can fix.
//     Fixing it (if confirmed) is Sprint 12+ scope, since Responses/Analytics/Reports/Dashboard are
//     rewritten there — this audit's job is to record the result, not silently assume it's fine.

// formId is optional throughout — omitted formId means the "All Responses" view spanning
// every form in the workspace, keyed under the literal 'all' segment.
export const responseKeys = {
  all: (formId?: string) => ['responses', formId ?? 'all'] as const,
  list: (formId: string | undefined, params: Partial<Omit<GetResponsesParams, 'formId'>>) =>
    ['responses', formId ?? 'all', params] as const,
  detail: (id: string) => ['response', id] as const,
  stats: (formId?: string) => ['responses', formId ?? 'all', 'stats'] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  analytics: () => [...dashboardKeys.all, 'analytics'] as const,
};

export interface AnalyticsRangeParams {
  from?: string;
  to?: string;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (formId: string, range: AnalyticsRangeParams) =>
    [...analyticsKeys.all, 'overview', formId, range] as const,
  trends: (formId: string, range: AnalyticsRangeParams, bucket: 'day' | 'week') =>
    [...analyticsKeys.all, 'trends', formId, range, bucket] as const,
  questions: (formId: string, range: AnalyticsRangeParams) =>
    [...analyticsKeys.all, 'questions', formId, range] as const,
  formsSummary: (range: AnalyticsRangeParams, page: number) =>
    [...analyticsKeys.all, 'forms', range, page] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  list: (page: number) => [...reportKeys.all, 'list', page] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  // notificationPreferences lives on the workspace document (confirmed live 18 Aug 2026) — no
  // dedicated query key; NotificationsTab reads/writes via this same key WorkspaceTab/BrandingTab
  // already share.
  workspace: () => [...settingsKeys.all, 'workspace'] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
};

// Not to be confused with settingsKeys' *email preference* notifications (Requirement 7 of
// Sprint 6) — this is the in-app notification bell/dropdown feed, a separate feature.
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

// Not to be confused with settingsKeys.workspace() — that's the V1 singular /workspaces/current
// settings resource (branding, logo). This is the V2 multi-workspace list/detail (sprint-8).
export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  // The context discriminator is a key segment, not a filter param, so switching context can
  // never serve another context's cached rows even transiently (requirements.md §7.10).
  forms: (context: FormsContext, params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    context.type === 'personal'
      ? (['forms', 'personal', 'list', params] as const)
      : (['forms', 'workspace', context.workspaceId, 'list', params] as const),
};

// Sprint 9 (team-permissions) — workspace-namespaced from the start, matching workspaceKeys.forms()'s
// own precedent: switching workspaces must never serve another workspace's cached member list.
export const teamKeys = {
  all: (workspaceId: string) => ['team', workspaceId] as const,
  members: (workspaceId: string) => [...teamKeys.all(workspaceId), 'members'] as const,
  invitations: (workspaceId: string) => [...teamKeys.all(workspaceId), 'invitations'] as const,
};

export const invitationKeys = {
  detail: (token: string) => ['invitation', token] as const,
};

export const formAccessKeys = {
  grants: (formId: string) => ['form-access', formId, 'grants'] as const,
};

// Sprint 10 (events-migration), design.md §10. activityKeys/auditKeys are workspace-namespaced from
// creation (teamKeys' precedent): switching workspaces must never serve another workspace's rows.
// `limit` is part of formEventKeys.list — Form Overview's 5-row preview and the "View all" drawer's
// fuller page would otherwise share a cache entry for page 1 and show each other's row counts.
export const formKeys = {
  all: (formId: string) => ['form', formId] as const,
  overview: (formId: string) => [...formKeys.all(formId), 'overview'] as const,
};

export const formEventKeys = {
  list: (formId: string, page = 1, limit = 5) => ['form-events', formId, 'list', page, limit] as const,
};

export const activityKeys = {
  all: (workspaceId: string) => ['activity', workspaceId] as const,
  list: (workspaceId: string, page = 1) => [...activityKeys.all(workspaceId), 'list', page] as const,
};

export const auditKeys = {
  all: (workspaceId: string) => ['audit', workspaceId] as const,
  list: (workspaceId: string, filters: { actorId?: string; range?: string; page?: number }) =>
    [...auditKeys.all(workspaceId), 'list', filters] as const,
};

export const sharedKeys = {
  all: ['shared-with-me'] as const,
  list: () => [...sharedKeys.all, 'list'] as const,
};
