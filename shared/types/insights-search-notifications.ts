// Insights, search and notifications - the wire shapes of every new or changed backend route, as IMPLEMENTED in
// Beginso-Backend (verified by src/__tests__/insights_search_notifications.test.ts). Interfaces and unions only.
// Owned by the backend developer; the frontend adapts to these (CLAUDE.md: defensive unwrapping still applies).
//
// Conventions that hold for every route below
//   - Errors: { success: false, message: string, error?: { code?: string, message: string } }
//   - Context: send `x-workspace-slug: <slug>` for a workspace, or `x-workspace-slug: personal` / no header for the
//     caller's personal space. A slug the caller does not belong to is always 403 (never a widened result).
//   - Auth: the usual session; 401 when missing.

// ---------------------------------------------------------------------------------------------------------------
// GET /api/search?q=&types=&limit=
//   q       2-100 chars after trim, treated as literal text (400 otherwise)
//   types   optional csv of forms|responses|members|templates (400 on an unknown value); default all four
//   limit   optional per-group item cap, 1-10, default 5 (larger values are clamped to 10)
// Rate limited per user (429, `Retry-After` header). 403 when the named workspace is not the caller's.
// Permission filtering happens on the server BEFORE counting: `total` counts visible items only.
// Answers are not indexed (P4): responses match on reference + respondent name/email only.
export type SearchGroupKey = 'forms' | 'responses' | 'members' | 'templates';

export interface SearchResultBase {
  id: string;
  type: SearchGroupKey;
  title: string;
  subtitle?: string;
}
export interface SearchFormResult extends SearchResultBase {
  type: 'forms';
  status: 'draft' | 'published' | 'closed' | (string & {});
  archived: boolean; // always false today: archived forms are excluded from search
}
export interface SearchResponseResult extends SearchResultBase {
  type: 'responses';
  formId: string;
  formTitle: string;
  reference: string; // "#142"; '' for a response that predates references
  submittedAt: string; // ISO UTC
}
export interface SearchMemberResult extends SearchResultBase {
  type: 'members';
  role: 'owner' | 'admin' | 'member' | 'editor' | 'viewer' | 'reviewer';
}
export interface SearchTemplateResult extends SearchResultBase {
  type: 'templates';
  source: 'workspace' | 'beginso';
  category: string;
}
export interface SearchGroup<T extends SearchResultBase> {
  total: number;
  items: T[];
}
export interface SearchResponse {
  success: true;
  q: string;
  scope: { kind: 'workspace' | 'personal'; label: string }; // label = workspace name, or "Personal"
  answerSearch: boolean; // false today - say so on screen
  groups: {
    forms: SearchGroup<SearchFormResult>;
    responses: SearchGroup<SearchResponseResult>;
    members: SearchGroup<SearchMemberResult>; // always empty in personal context
    templates: SearchGroup<SearchTemplateResult>;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Notifications
// GET /api/notifications
//   No context header and no query params  -> the legacy call, byte-for-byte as before: newest 50 across every context,
//                                             response `{ success, notifications }` (NO nextCursor key).
//   Any context header or any of the params below -> context scoped.
//     unread=true|1        only unread
//     type=a,b             csv of welcome|password_reset|form_activity|assignment|mention|response_edited (400 otherwise)
//     limit                1-50, default 30
//     cursor               opaque; pass the previous response's nextCursor (400 if malformed)
//   Context scoping: workspace slug -> that workspace's notifications. personal / no workspace -> notifications with no
//   workspace PLUS legacy rows whose workspaceId points at a workspace that no longer exists (OQ-7).
export type NotificationType = 'welcome' | 'password_reset' | 'form_activity' | 'assignment' | 'mention' | 'response_edited' | (string & {});

export interface AppNotificationWire {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
export interface NotificationsListResponse {
  success: true;
  notifications: AppNotificationWire[];
  nextCursor?: string | null; // absent on the legacy call; null on the last page of a scoped call
}
// GET /api/notifications/unread-count   (context scoped, caller scoped)
export interface UnreadCountResponse {
  success: true;
  count: number;
}
// POST /api/notifications/read-all      (context scoped, caller scoped, idempotent; no body)
export interface ReadAllResponse {
  success: true;
  updated: number; // 0 when there was nothing unread
}
// POST|PATCH /api/notifications/:id/read is unchanged.

// ---------------------------------------------------------------------------------------------------------------
// completionRate - ONE meaning on every endpoint (OQ-3).
//   completionRate = non-test, non-deleted submissions / counted views * 100, capped at 100, null when the form has no
//                    counted views. Preview loads (`POST /api/public/:slug/view?preview=1`) are never counted.
//   reviewedRate   = the OLD stage-based figure (responses in a "completed" stage / responses in range), 0-100.
// GET /api/analytics/overview?formId=  -> { success, data: AnalyticsOverviewData }
export interface AnalyticsOverviewWithViews {
  formId: string;
  total: number;
  completed: number;
  in_progress: number;
  new: number;
  completionRate: number | null; // CHANGED meaning (was stage-based)
  reviewedRate: number; // NEW: the old figure
  views: number | null; // NEW
  // ...statusDistribution, stageDistribution, dateRange unchanged
}
// GET /api/analytics/forms -> { success, data: AnalyticsFormRow[], total, page, limit, totalPages }
export interface AnalyticsFormRowWithViews {
  formId: string;
  title: string;
  status: string;
  totalResponses: number; // in the selected range
  completionRate: number | null; // CHANGED meaning
  reviewedRate: number; // NEW: the old figure
  views: number | null; // NEW
  templateCategory: string | null; // NEW
  templateId: string | null; // NEW
  sparkline: number[];
  updatedAt: string;
}
// GET /api/forms/:formId/overview -> { success, overview: { ...existing, views, templateId, templateCategory } }
//   (its completionRate already had the views-based meaning)
// A Form document (GET /api/forms/:id, list, POST /api/templates/:id/use) now carries
//   templateId: string | null, templateCategory: string | null. Null for every form not made from a template and for
//   every form that existed before Sprint 14 (no backfill).
// Analytics date ranges: a date-only `to` ("2026-10-06") now means the END of that day.

// ---------------------------------------------------------------------------------------------------------------
// Saved charts (/api/forms/:formId/charts ...)
// Permissions: list / data / preview need analytics:read on the form (per-form grants honoured);
//              create / patch / delete need forms:write on the form. 403 otherwise, 404 unknown form / chart.
export type ChartType = 'bar' | 'donut' | 'line';
export type ChartGroupBy = 'value' | 'day' | 'week';

export interface SavedChartWire {
  _id: string;
  fieldId: string;
  chartType: ChartType;
  groupBy: ChartGroupBy;
  order: number;
  fieldMissing: boolean; // the question was deleted from the form after the chart was made
}
// Valid combinations (anything else is 400 `INVALID_CHART`):
//   dropdown | multiple_choice | checkbox -> chartType bar|donut, groupBy 'value'
//   date                                  -> chartType 'line',    groupBy 'day'|'week'
export interface ChartDefinitionBody {
  fieldId: string;
  chartType: ChartType;
  groupBy: ChartGroupBy;
}
// GET    /api/forms/:formId/charts                  -> { success, charts: SavedChartWire[] }
export interface ListChartsResponse {
  success: true;
  charts: SavedChartWire[];
}
// POST   /api/forms/:formId/charts   body ChartDefinitionBody -> 201 { success, chart: SavedChartWire }  (max 20 per form)
// PATCH  /api/forms/:formId/charts/:chartId  body Partial<ChartDefinitionBody> & { order?: number } -> { success, chart }
// DELETE /api/forms/:formId/charts/:chartId -> { success: true }
export interface ChartResponse {
  success: true;
  chart: SavedChartWire;
}
// GET  /api/forms/:formId/charts/:chartId/data?from=&to=
// POST /api/forms/:formId/charts/preview   body ChartDefinitionBody & { from?: string; to?: string }  (reads only; unsaved)
//   Both exclude test and deleted responses. Choice fields list every option (zero included); date fields are sorted
//   ascending, labels "YYYY-MM-DD" (day) or "YYYY-Www" (week, ISO).
export interface ChartDataResponse {
  success: true;
  fieldMissing: boolean;
  series: { label: string; value: number }[];
  total: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Reports / exports (audit trail - no shape change for the client)
//   POST /api/reports        -> unchanged response; records Event `report.create` with metadata
//                               { reportId, format, formId, rows } (rows = rows the file will hold, or null)
//   GET  /api/reports/:id/file -> unchanged; records Event `report.download` { reportId, formId, format, rows } once the
//                               file has been fully sent. A 403 / 404 / 410 / aborted transfer logs nothing.
//   Both appear in the workspace audit log (Event collection). They are NOT in the per-response activity feed.

// ---------------------------------------------------------------------------------------------------------------
// Email notifications (no client API except the unsubscribe link)
//   Sent for: a new non-test response, a mention, an assignment. Honours Membership.notificationPreference:
//   all -> everything; mine -> responses assigned to them or on forms they created, plus mentions/assignments;
//   none -> nothing. Body: form name, response reference, time, login link, unsubscribe link. NO answers/attachments/questions.
// GET /api/public/notifications/unsubscribe/:token   (no session; signed; 30 day expiry)
//   200 -> sets that membership's notificationPreference to 'none' (idempotent). HTML page, or JSON when
//          `Accept: application/json`: { success: true, message }.
//   400 TOKEN_INVALID, 410 TOKEN_EXPIRED -> { success: false, message, error: { code, message } }
export interface UnsubscribeJsonResponse {
  success: boolean;
  message: string;
  error?: { code: 'TOKEN_INVALID' | 'TOKEN_EXPIRED'; message: string };
}

// GET /api/health additionally returns { commit, commitMessage, deployedAt } (each string | null).
