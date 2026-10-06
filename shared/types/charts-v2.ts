// Charts v2 wire contract (backend: Beginso-Backend, 6 Oct 2026). Owned by the backend side; the frontend
// imports it, it does not edit it. Verified = covered by src/__tests__/charts_v2.test.ts against the
// in-memory database, not against production data. Prose + status per endpoint: docs/backend-contract/api-reference.md.
//
// Errors everywhere: { success:false, message, error:{ code?, message } }.

// ---------------------------------------------------------------- field aggregate  (NEW)
// GET /api/forms/:formId/analytics/field/:fieldId?from=&to=&granularity=day|week|month&includeTest=true
// Permission: analytics:read on the form (+ per-form grant / personal-form owner), same as chart data.
// 404 FIELD_NOT_FOUND (unknown / deleted question) · 400 FIELD_NOT_CHARTABLE (text, email, phone, file...) ·
// 400 INVALID_GRANULARITY · 403 · 404 form.
export type ChartableFieldType = 'dropdown' | 'multiple_choice' | 'checkbox' | 'number' | 'date';
export type Granularity = 'day' | 'week' | 'month';

/** Bucket `value` of a response that answered, but with something that is not one of the field's options. */
export const SEGMENT_OTHER = '__other__';
/** `value` that selects the responses with no usable answer (`FieldAggregate.blank` of them). */
export const SEGMENT_BLANK = '__blank__';

export interface FieldBucket {
  /** Pass this, unchanged, as `value=` to GET /api/responses to open the panel for exactly this bar.
   *  choice: the option text as defined on the form ('__other__' for the Other bucket);
   *  number: the number as a string ('5', '4.5');
   *  date: the ISO bucket key for `granularity`: '2026-09-27' | '2026-W39' | '2026-09'. */
  value: string;
  label: string; // same as value except Other ('Other')
  count: number; // responses in this bucket (a checkbox response counts once in EACH option it selected)
  percentage: number; // count / FieldAggregate.total * 100, one decimal. Checkbox percentages can sum above 100.
  /** choice: index in the field's ORIGINAL option order (Other is last); number/date: ascending by value.
   *  Buckets are returned already in `order`; sort by `value` (numeric / chronological for number+date)
   *  or by `count` on the client for ChartOptions.sort === 'value'. */
  order: number;
  other?: true; // only on the Other bucket
}

export interface FieldAggregate {
  success: true;
  fieldId: string;
  fieldType: ChartableFieldType;
  /** Responses in range that answered this question. This is the percentage denominator. */
  total: number;
  /** Responses in range that did not (filter them with value=__blank__). total + blank === totalResponses. */
  blank: number;
  totalResponses: number;
  /** choice: every defined option (zero counts included, original order) + Other when it has any.
   *  number / date: only values that occur, ascending, at most 500 (then `truncated`). */
  buckets: FieldBucket[];
  granularity?: Granularity; // date fields only (the one used; default 'day')
  stats?: { average: number | null; min: number | null; max: number | null }; // number fields only; null when nobody answered
  truncated?: boolean; // number / date fields only: more than 500 distinct values existed
}

// ---------------------------------------------------------------- responses filtered by field value  (EXTENDS GET /api/responses)
// GET /api/responses?formId=<id>&field=<fieldId>&value=<FieldBucket.value>[&granularity=day|week|month]
//   plus any of the existing filters: stageId, status, tagIds (csv or repeated), assigneeId (id|'me'|'unassigned'),
//   unread, duplicate, from, to, q (alias of search), includeTest, page, limit (<=50).
// `total` / `totalPages` are the server's count of the segment and equal FieldBucket.count for the same
// from/to/includeTest. Errors (400): FIELD_FILTER_REQUIRES_FORM (no formId) · FIELD_NOT_FOUND · FIELD_NOT_CHARTABLE ·
// INVALID_FILTER_VALUE (value missing, not a number for a number field, not a bucket key for a date field) ·
// INVALID_GRANULARITY. `value` is matched literally. POST /api/reports accepts the same field/value/granularity
// (and 400s the same way) so "Export this segment" exports exactly the panel's rows.
export interface FieldSegmentQuery {
  formId: string;
  field: string;
  value: string;
  granularity?: Granularity; // required to match the bucket key's shape when field is a date
}

// ---------------------------------------------------------------- saved charts  (EXTENDS /api/forms/:formId/charts)
export type ChartType = 'pie' | 'donut' | 'bar' | 'hbar' | 'line' | 'area' | 'stat';
export type ChartSize = 'small' | 'medium' | 'large';
export type ChartVisibility = 'private' | 'workspace';

/** Allowed chartType per field type; anything else is 400 INVALID_CHART. `stat` shows FieldAggregate.stats.average. */
export const CHART_TYPES_BY_FIELD: Record<ChartableFieldType, readonly ChartType[]> = {
  dropdown: ['pie', 'donut', 'bar', 'hbar'],
  multiple_choice: ['pie', 'donut', 'bar', 'hbar'],
  checkbox: ['pie', 'donut', 'bar', 'hbar'],
  number: ['bar', 'line', 'stat'],
  date: ['line', 'area', 'bar'],
};

export interface ChartOptions {
  valueMode: 'count' | 'percent';
  legend: boolean;
  sort: 'value' | 'order';
}

export interface SavedChart {
  _id: string;
  formId: string;
  fieldId: string;
  fieldType: ChartableFieldType | string | null; // null when the question was deleted
  chartType: ChartType;
  granularity: Granularity | null; // date charts only
  /** @deprecated Sprint 14 name: 'value' (choice/number), else 'day' | 'week' ('month' reads as 'day'). Use granularity. */
  groupBy: 'value' | 'day' | 'week';
  size: ChartSize;
  title: string; // defaults to the question's label; <= 120
  options: ChartOptions;
  visibility: ChartVisibility;
  ownerId: string | null;
  ownerName: string | null;
  isOwner: boolean;
  canEdit: boolean; // owner, or an owner/admin of the workspace for a workspace-visible chart
  position: number;
  /** @deprecated Sprint 14 name of position (same value). */
  order: number;
  fieldMissing: boolean; // the question was deleted after the chart was made: render the "no longer exists" card, offer Remove
  createdAt: string;
  updatedAt: string;
}

// GET    /api/forms/:formId/charts                       -> { success, charts: SavedChart[] }   analytics:read
//        The caller's own charts (private + workspace) by position, then everyone else's workspace charts.
// POST   /api/forms/:formId/charts                       -> 201 { success, chart }              forms:write
export interface CreateChartBody {
  fieldId: string;
  chartType: ChartType;
  granularity?: Granularity; // date fields; default 'day'. Ignored for other fields.
  size?: ChartSize; // default 'medium'
  title?: string; // default: the question's label
  options?: Partial<ChartOptions>; // default { valueMode:'count', legend:true, sort:'order' }
  visibility?: ChartVisibility; // default 'private'
  /** Sprint 14 clients only. If sent (and no granularity) it is mapped to granularity, and visibility defaults to 'workspace'. */
  groupBy?: 'value' | 'day' | 'week';
}
// PATCH  /api/forms/:formId/charts/:chartId              -> { success, chart }                  forms:write + owner (or admin/owner for a workspace chart)
export type PatchChartBody = Partial<Omit<CreateChartBody, 'groupBy'>> & { position?: number; order?: number; groupBy?: 'value' | 'day' | 'week' };
//        Only a change to fieldId / chartType / granularity is re-validated against the field, so title/size/
//        options/visibility/position still save on a chart whose question was deleted.
// PUT    /api/forms/:formId/charts/order                 -> { success, charts: SavedChart[] }   forms:write
export interface ReorderChartsBody { ids: string[] } // the caller's OWN charts, each once; unlisted own charts follow
//        400 FOREIGN_CHART_IDS if any id is not one of the caller's own charts on this form (others', other form, unknown, repeated).
// POST   /api/forms/:formId/charts/:chartId/duplicate    -> 201 { success, chart }              forms:write; any chart the caller can see
//        The copy is private, owned by the caller, title "<title> (copy)", placed last.
// DELETE /api/forms/:formId/charts/:chartId              -> { success }                         hard delete; undo = POST the same body again
// GET    /api/forms/:formId/charts/:chartId/data?from=&to=&includeTest=   -> ChartDataResponse  analytics:read; 404 if not visible to the caller
// POST   /api/forms/:formId/charts/preview               body { fieldId, chartType, granularity?, from?, to? } -> ChartDataResponse
// Errors: 400 INVALID_CHART (type not allowed for the field / unknown or unchartable field) · 400 VALIDATION_ERROR ·
//   400 CHART_LIMIT (20 per person per form) · 403 FORBIDDEN_CHART (visible but not editable) · 404 (form, chart, or someone else's private chart)
export interface ChartDataResponse {
  success: true;
  fieldMissing: boolean;
  /** Sprint 14 shape: { label, value:count }[] (choice charts include Other when it has any). */
  series: { label: string; value: number }[];
  /** Sprint 14 shape: sum of the series (selections, so for a checkbox it can exceed the number of responses). Prefer aggregate.total. */
  total: number;
  /** The same payload GET .../analytics/field/:fieldId returns (without `success`); null when fieldMissing. Use this in v2. */
  aggregate: Omit<FieldAggregate, 'success'> | null;
}
