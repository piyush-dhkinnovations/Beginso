export const RESPONSE_LAYOUTS = ['grid', 'list', 'table'] as const;
export type ResponseLayout = (typeof RESPONSE_LAYOUTS)[number];
export type ResponseDensity = 'comfortable' | 'compact';

/** The four display settings a layout choice carries. A choice always replaces all four together. */
export interface ResponseViewSettings {
  layout: ResponseLayout;
  density: ResponseDensity;
  showEmpty: boolean;
  showNumbers: boolean;
}

export type ResponseViewSource = 'personal' | 'personalAll' | 'formDefault' | 'system';

export interface ResolvedResponseView extends ResponseViewSettings {
  source: ResponseViewSource;
}

export interface PersonalResponseView extends ResponseViewSettings {
  scope: string;
  updatedAt?: string;
}

export interface FormResponseViewDefault extends ResponseViewSettings {
  version: number;
  pinned: string[];
  fields: { fieldId: string; hidden?: boolean; span?: 'half' | 'full'; order?: number }[];
}

/** GET /api/forms/:formId/response-view */
export interface ResponseViewConfig {
  resolved: ResolvedResponseView;
  formDefault: FormResponseViewDefault | null;
  personal: PersonalResponseView | null;
  personalAll: PersonalResponseView | null;
}
