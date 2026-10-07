// Sprint 14, design.md §11.2/§13 (GET /api/search). Uncertain until BE 0.6 ships — read defensively.
export type SearchGroupKey = 'forms' | 'responses' | 'members' | 'templates';

export interface SearchResultBase {
  id: string;
  type: SearchGroupKey;
  title: string;
  subtitle?: string;
}

export interface FormSearchResult extends SearchResultBase {
  type: 'forms';
  status?: string;
  archived?: boolean;
}

export interface ResponseSearchResult extends SearchResultBase {
  type: 'responses';
  formId: string;
  formTitle?: string;
  reference?: string; // "#142"
  submittedAt?: string;
}

export interface MemberSearchResult extends SearchResultBase {
  type: 'members';
  role?: string;
}

export interface TemplateSearchResult extends SearchResultBase {
  type: 'templates';
  source?: 'workspace' | 'beginso';
  category?: string;
}

export type SearchResult = FormSearchResult | ResponseSearchResult | MemberSearchResult | TemplateSearchResult;

export interface SearchGroup {
  total: number;
  items: SearchResult[];
}

export interface SearchResponse {
  q: string;
  scope: { kind: 'workspace' | 'personal'; label: string };
  /** Typed `boolean`, not the literal `false`, so the UI never breaks if it flips. */
  answerSearch: boolean;
  groups: Record<SearchGroupKey, SearchGroup>;
}

export const SEARCH_GROUP_ORDER: SearchGroupKey[] = ['forms', 'responses', 'members', 'templates'];
export const SEARCH_GROUP_LABEL: Record<SearchGroupKey, string> = {
  forms: 'Forms',
  responses: 'Responses',
  members: 'Members',
  templates: 'Templates',
};
