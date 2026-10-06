// Custom charts (Sprint 14 rebuild). A chart is a QUESTION about the responses; its segments drill
// down to the responses behind them. Backend contract to confirm (BE agent implementing in parallel):
// persisted per form per user - field, type, size, title, options, position, visibility.
export type ChartType = 'pie' | 'donut' | 'bar' | 'horizontal_bar' | 'line' | 'area' | 'bar_time' | 'average';
export type ChartSize = 'small' | 'medium' | 'large';
/** private = creator only (default); workspace = visible read-only to everyone with analytics access. */
export type ChartVisibility = 'private' | 'workspace';
export type DateGranularity = 'day' | 'week' | 'month';

export interface ChartOptions {
  valueMode: 'count' | 'percent';
  legend: boolean;
  sort: 'value' | 'original';
}

export interface ChartDefinition {
  fieldId: string;
  type: ChartType;
  size: ChartSize;
  title: string;
  options: ChartOptions;
  visibility: ChartVisibility;
}

export interface SavedChart extends ChartDefinition {
  _id: string;
  position: number;
  ownerId?: string;
  ownerName?: string;
  fieldMissing?: boolean;
}

/** One row of GET /api/forms/:formId/analytics/field/:fieldId. `value` is the raw answer (choice option,
 * rating/number as text) or the date bucket ("2026-09-30" | "2026-W40" | "2026-09"). */
export interface FieldBucket {
  value: string;
  count: number;
  percentage: number;
}
