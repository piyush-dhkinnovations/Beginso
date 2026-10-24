import type { StageCategory, StageColorToken } from '@/types/stage';

/**
 * How one form's Responses page is set up ("Customize" on the page, owner and admins only). Everything is optional on the server: a
 * form nobody customised reads back as DEFAULT_RESPONSE_SETUP, which is exactly how the page always looked.
 */
export const TABLE_BUILTIN_COLUMNS = ['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted', 'score', 'notes'] as const;
export type TableBuiltinColumn = (typeof TABLE_BUILTIN_COLUMNS)[number];

/** A table column key: a built-in column, or `q:<fieldId>` for one of the form's questions. */
export type TableColumnKey = string;

export const questionColumn = (fieldId: string): TableColumnKey => `q:${fieldId}`;
export const questionOfColumn = (key: TableColumnKey): string | undefined => (key.startsWith('q:') ? key.slice(2) : undefined);

export type OpensAs = 'table' | 'board' | 'calendar';
export type ResponseSort = 'newest' | 'oldest';
export type RowHeight = 'comfortable' | 'compact';

export interface ResponseSetupValues {
  tableColumns: TableColumnKey[];
  /** The question that headlines a Board card, or `auto` (the respondent's name, else their email). */
  cardTitle: string;
  opensAs: OpensAs;
  sort: ResponseSort;
  /** The question that names the respondent in the table, board and response panel, or `auto`. */
  respondentFrom: string;
  rowHeight: RowHeight;
  wrap: boolean;
}

export const DEFAULT_TABLE_COLUMNS: TableColumnKey[] = ['respondent', 'email', 'tags', 'assignee', 'stage', 'submitted'];

export const DEFAULT_RESPONSE_SETUP: ResponseSetupValues = {
  tableColumns: DEFAULT_TABLE_COLUMNS,
  cardTitle: 'auto',
  opensAs: 'table',
  sort: 'newest',
  respondentFrom: 'auto',
  rowHeight: 'comfortable',
  wrap: false,
};

/** One stage of a form, as the server returns it. */
export interface FormStage {
  id: string;
  name: string;
  colour: string;
  category: StageCategory;
  order: number;
  isDefault: boolean;
}

export interface FormStages {
  /** `workspace`: the form uses the workspace's stages. `own`: it has stages of its own. */
  mode: 'workspace' | 'own';
  list: FormStage[];
  /** Position, in `list`, of the stage new responses start in (own stages only). */
  startIndex: number | null;
}

export interface ResponseSetup {
  /** Send back when saving; a different current version means someone saved first (409). 0 = never customised. */
  version: number;
  setup: ResponseSetupValues;
  stages: FormStages;
}

export interface EditableStage {
  /** Absent for a stage added in the panel and not saved yet. */
  id?: string;
  name: string;
  colour: StageColorToken;
  category: StageCategory;
}

/** PUT /api/forms/:formId/response-setup */
export interface SaveResponseSetupInput extends ResponseSetupValues {
  version: number;
  stages: { mode: 'workspace' } | { mode: 'own'; stages: EditableStage[]; startIndex?: number };
}
