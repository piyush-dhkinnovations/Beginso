/**
 * Shared TypeScript interfaces for Analytics (Sprint 5).
 * Shapes match the proposed backend contract in docs/backend-contract/api-reference.md §4 —
 * not yet confirmed live, see requirements.md §15. `GET /api/analytics/questions` in particular
 * is an Open Question pending backend sign-off.
 */

export interface GetAnalyticsParams {
  formId?: string;
  from?: string;   // ISO date, UTC day boundary
  to?: string;     // ISO date, UTC day boundary
  timezone?: string; // IANA zone, e.g. "Asia/Kolkata" — from Intl.DateTimeFormat().resolvedOptions().timeZone
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface AnalyticsOverview {
  totalResponses: number;
  statusCounts: {
    new: number;
    in_progress: number;
    completed: number;
  };
}

export interface AnalyticsTrendPoint {
  bucketStart: string; // ISO date
  responses: number;
}

export interface AnalyticsTrendResult {
  bucket: 'day' | 'week';
  points: AnalyticsTrendPoint[];
}

export interface QuestionOption {
  option: string;
  count: number;
}

export interface QuestionBreakdown {
  fieldId: string;
  label: string;
  options: QuestionOption[];
}

export interface AnalyticsFormSummary {
  _id: string;
  title: string;
  status: 'draft' | 'published' | 'closed';
  totalResponses: number;
  completionRate: number; // 0-100
}

export interface AnalyticsFormsSummaryResult {
  forms: AnalyticsFormSummary[];
  total: number;
  page: number;
  limit: number;
}
