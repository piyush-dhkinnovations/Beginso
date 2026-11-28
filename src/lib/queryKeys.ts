import type { GetResponsesParams } from '@/types/response';
import type { FormsContext } from '@/types/workspace';

// Every key factory keeps one context's cached rows apart from another's, in one of two ways:
//
// (a) The context is a key segment: `scope` (a workspace slug or 'personal') or the workspace itself, as in
//     responseKeys, reportKeys, workspaceKeys.forms(), teamKeys, activityKeys and auditKeys.
//     __tests__/lib/queryKeys.test.ts proves key('a') !== key('b').
// (b) The key is already unique or per-caller, so a workspace segment would be redundant: by formId (a Mongo
//     ObjectId, unique across every workspace and personal space), invitationKeys by token, and the signed-in
//     person's own profile and sessions.

// `scope` (a workspace slug, or the literal 'personal') is a key segment, matching workspaceKeys.forms()'s
// own precedent: switching workspaces (or personal ⇄ workspace) must never serve another scope's
// cached responses. formId is optional throughout — omitted formId means the "All Responses" view
// spanning every form in the scope, keyed under the literal 'all' segment.
export const responseKeys = {
  all: (scope: string, formId?: string) => ['responses', scope, formId ?? 'all'] as const,
  list: (scope: string, formId: string | undefined, params: Partial<Omit<GetResponsesParams, 'formId'>>) =>
    ['responses', scope, formId ?? 'all', params] as const,
  detail: (scope: string, id: string) => ['responses', scope, 'detail', id] as const,
  stats: (scope: string, formId?: string) => ['responses', scope, formId ?? 'all', 'stats'] as const,
};

export const responseSetupKeys = {
  form: (formId: string) => ['response-setup', formId] as const,
};

export const stageKeys = {
  list: (scope: string) => ['stages', scope] as const,
};

export const tagKeys = {
  list: (scope: string) => ['tags', scope] as const,
};

export const viewKeys = {
  list: (scope: string, formId?: string) => ['views', scope, formId ?? 'all'] as const,
};

// Criteria are workspace-namespaced (stageKeys' own precedent); a response's score is namespaced
// by its id (a globally unique Mongo ObjectId).
export const scoreKeys = {
  criteria: (scope: string) => ['score-criteria', scope] as const,
  detail: (responseId: string) => ['scores', 'detail', responseId] as const,
};

// Namespaced by response id (a Mongo
// ObjectId, globally unique) plus scope, matching responseKeys.detail()'s own segment order.
export const noteKeys = {
  list: (scope: string, responseId: string) => ['responses', scope, 'detail', responseId, 'notes'] as const,
};

// Named distinctly from `activityKeys` below (the workspace activity feed) — this is a
// single response's own timeline, a different query entirely.
export const responseActivityKeys = {
  list: (scope: string, responseId: string) => ['responses', scope, 'detail', responseId, 'activity'] as const,
};

/** Every cached response timeline. Invalidate it after one's own change so the open one updates at once, not at its next poll. */
export const allResponseActivity = {
  queryKey: ['responses'] as const,
  predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[4] === 'activity',
};

// How a form's submitted response is laid out for the caller. Deliberately NOT under 'responses', so changing the
// layout never refetches the response lists.
export const responseViewKeys = {
  form: (formId: string) => ['response-view', formId] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  // Personal Home has no scope in its key (unchanged); a workspace Home adds its slug.
  analytics: (scope?: string) => (scope && scope !== 'personal' ? ([...dashboardKeys.all, 'analytics', scope] as const) : ([...dashboardKeys.all, 'analytics'] as const)),
  layout: (scope: string) => [...dashboardKeys.all, 'layout', scope] as const,
  responseTrend: () => [...dashboardKeys.all, 'response-trend-30d'] as const,
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
  // `scope` is a key segment (workspace slug or 'personal'), so switching workspaces never serves another's rows.
  formsSummary: (range: AnalyticsRangeParams, page: number, scope = 'personal') =>
    [...analyticsKeys.all, 'forms', scope, range, page] as const,
};

// Custom charts: every key carries the workspace scope (slug or 'personal') so switching workspace
// never serves another's charts, layout or distributions.
export const chartKeys = {
  all: ['charts'] as const,
  list: (scope: string, formId: string) => [...chartKeys.all, scope, formId, 'list'] as const,
  field: (scope: string, formId: string, fieldId: string, range: AnalyticsRangeParams, granularity?: string) =>
    [...chartKeys.all, scope, formId, 'field', fieldId, range, granularity ?? null] as const,
  drill: (scope: string, formId: string, fieldId: string, value: string | undefined, range: AnalyticsRangeParams, granularity?: string) =>
    [...chartKeys.all, scope, formId, 'drill', fieldId, value ?? null, range, granularity ?? null] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  list: (page: number, scope = 'personal') => [...reportKeys.all, 'list', scope, page] as const,
  detail: (id: string) => [...reportKeys.all, 'detail', id] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  profile: () => [...settingsKeys.all, 'profile'] as const,
  // notificationPreferences lives on the workspace document (confirmed live 18 Aug 2026) — no
  // dedicated query key; NotificationsTab reads/writes via this same key WorkspaceTab/BrandingTab
  // already share.
  workspace: (scope?: string) => [...settingsKeys.all, 'workspace', ...(scope ? [scope] : [])] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
};

// Not to be confused with settingsKeys' *email preference* notifications
// — this is the in-app notification bell/dropdown feed, a separate feature.
export const notificationKeys = {
  all: ['notifications'] as const,
  // Context-namespaced — `scope` is a workspace slug or 'personal' — so
  // switching context can never serve another context's rows or badge count.
  list: (scope: string, filter: 'all' | 'unread' | 'mentions') => [...notificationKeys.all, 'list', scope, filter] as const,
  lists: (scope: string) => [...notificationKeys.all, 'list', scope] as const,
  unread: (scope: string) => [...notificationKeys.all, 'unread', scope] as const,
  unreadOfType: (scope: string, type: string) => [...notificationKeys.all, 'unread', scope, type] as const,
};

// Context- and query-namespaced; removed wholesale on context/role change.
export const searchKeys = {
  all: ['search'] as const,
  results: (scope: string, q: string) => [...searchKeys.all, scope, q] as const,
};

// Not to be confused with settingsKeys.workspace() — that's the V1 singular /workspaces/current
// settings resource (branding, logo). This is the V2 multi-workspace list/detail.
export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  // The context discriminator is a key segment, not a filter param, so switching context can
  // never serve another context's cached rows even transiently.
  forms: (context: FormsContext, params?: { search?: string; status?: string; page?: number; limit?: number; archived?: string; pinned?: boolean; sort?: string; order?: string }) =>
    context.type === 'personal'
      ? (['forms', 'personal', 'list', params] as const)
      : (['forms', 'workspace', context.workspaceId, 'list', params] as const),
};

// Workspace-namespaced from the start, matching workspaceKeys.forms()'s
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

// activityKeys/auditKeys are workspace-namespaced from
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

// Readiness is by formId (globally unique,
// bucket (b) above). Trash and templates are workspace-scoped, so `scope` (a workspace slug or the
// literal 'personal') is a key segment. respondentKeys.link takes a hash, never the raw token.
export const readinessKeys = {
  form: (formId: string) => ['form-readiness', formId] as const,
};

export const trashKeys = {
  all: (scope: string) => ['trash', scope] as const,
  list: (scope: string, type: 'all' | 'form' | 'response', page = 1) =>
    [...trashKeys.all(scope), 'list', type, page] as const,
};

export const templateKeys = {
  all: (scope: string) => ['templates', scope] as const,
  list: (scope: string) => [...templateKeys.all(scope), 'list'] as const,
};

export const respondentKeys = {
  mine: () => ['my-submissions'] as const,
  detail: (id: string) => ['my-submissions', 'detail', id] as const,
  link: (tokenHash: string) => ['respond-link', tokenHash] as const,
};
