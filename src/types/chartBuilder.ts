// Charts v3 (the chart builder): a chart is "group the responses by one field, measure each group, after these filters".
// These mirror the backend contract in Beginso-Backend/src/utils/chartQuery.ts (POST /api/forms/:formId/charts/query).

export type SystemKey = 'stage' | 'assignee' | 'tags' | 'submittedAt';
export type FieldRef = { kind: 'question'; fieldId: string } | { kind: 'system'; key: SystemKey };
export type Bucket = 'day' | 'week' | 'month' | 'year';
export type MeasureType = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type SortKey = 'value_desc' | 'value_asc' | 'label_asc' | 'label_desc' | 'natural';
export type ChoiceOp = 'is' | 'is_not';
export type NumberOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type FilterOp = ChoiceOp | NumberOp;

export interface FilterCondition {
  field: FieldRef;
  op: FilterOp;
  value: string | number;
}
export interface InnerGroup {
  op: 'and' | 'or';
  items: FilterCondition[];
}
export interface FilterGroup {
  op: 'and' | 'or';
  items: (FilterCondition | InnerGroup)[];
}

export type Palette = 'theme' | 'ocean' | 'sunset' | 'forest' | 'mono';
export interface ChartDisplay {
  values: 'counts' | 'percent';
  legend: boolean;
  dataLabels: boolean;
  palette: Palette;
  interactive: boolean;
}

/** The part of a chart that decides WHAT is counted. */
export interface ChartQuery {
  kind: 'simple';
  measure: { type: MeasureType; field?: FieldRef };
  groupBy: { field: FieldRef; bucket?: Bucket };
  filters?: FilterGroup;
  sort?: SortKey | null;
  display?: ChartDisplay;
}

/** What the page draws. 'auto' = picked from the field (see lib/chartBuilder.ts autoChartType). */
export type BuilderChartType = 'auto' | 'bar' | 'hbar' | 'donut' | 'line';

/** One level of a drill-down chart: a field to group by, how, and how that level is drawn (null = automatic / the field's default). */
export interface DrillLevel {
  field: FieldRef;
  bucket?: Bucket;
  sort?: SortKey | null;
  chartType?: Exclude<BuilderChartType, 'auto'> | null;
}
export const MIN_LEVELS = 2;
export const MAX_LEVELS = 4;

/** A chart you can open level by level: the same measure and filters, grouped by level 1; a click on a part groups that part by level 2... */
export interface DrillQuery {
  kind: 'drilldown';
  measure: { type: MeasureType; field?: FieldRef };
  levels: DrillLevel[];
  filters?: FilterGroup;
  display?: ChartDisplay;
}
/** Whatever a saved chart carries as its definition. */
export type AnyChartQuery = ChartQuery | DrillQuery;

/** One part already clicked on screen: the level it was clicked on and the group itself. */
export interface DrillStep {
  level: number;
  entry: QueryEntry;
}

/** One part already clicked, as the server wants it: the level it was clicked on, and the group's own focus. */
export interface PathStep extends QueryFocus {
  level: number;
}
export type BuilderChartSize = 'small' | 'medium' | 'large';

/** What the grouped field turned out to be (the server's classification). */
export type GroupKind = 'choice' | 'number' | 'rating' | 'date' | 'stage' | 'assignee' | 'tags' | 'time';

export interface QueryFocus {
  key: string;
  lo?: number;
  hi?: number;
}
export interface QueryEntry {
  key: string;
  label: string;
  value: number;
  n: number;
  /** 0..1, of respondents for a count (a respondent who picked three options is in all three). */
  share: number;
  focus: QueryFocus;
}
export interface QueryWarning {
  code: string;
  message: string;
}
export interface QueryResult {
  level: { field: FieldRef; label: string; kind: GroupKind; bucket?: Bucket };
  fieldType: string | null;
  optionCount: number | null;
  measure: { type: MeasureType; label: string; field?: FieldRef; fieldLabel?: string };
  total: number;
  answered: number;
  blank: number;
  blankLabel: string;
  measureAnswered: number | null;
  entries: QueryEntry[];
  shown: number;
  totalGroups: number;
  /** Drill-down: which level this is (0 = the first) and how many there are; a simple chart is 0 of 1. */
  depth?: number;
  levelCount?: number;
  /** What a click on a part would group by next; null on the last level. */
  nextLevel?: { field: FieldRef; label: string; bucket?: Bucket } | null;
  warnings: QueryWarning[];
  computedAt: string;
}

/** A saved v3 chart as the list returns it. */
export interface BuilderChart {
  _id: string;
  formId: string;
  kind: 'simple' | 'drilldown';
  definition: AnyChartQuery;
  version: number;
  chartType: BuilderChartType | string;
  size: BuilderChartSize;
  title: string;
  visibility: 'private' | 'workspace';
  position: number;
  ownerId?: string | null;
  ownerName?: string | null;
  isOwner?: boolean;
  canEdit?: boolean;
  fieldMissing?: boolean;
}
