/**
 * Shared TypeScript interfaces for Analytics.
 * Shapes match the backend contract in docs/backend-contract/api-reference.md §4, extended by
 * Sprint 12 (inbox-collaboration) requirements.md §7.3 #3 / design.md §2: the status split groups
 * by workspace-defined stage `category` (OQ-11's default) so a custom stage set still yields a
 * coherent three-bucket donut, rather than by the removed fixed `status` union.
 */

import type { StageCategory } from './stage';

export interface GetAnalyticsParams {
  formId?: string;
  from?: string;   // ISO date, UTC day boundary
  to?: string;     // ISO date, UTC day boundary
  timezone?: string; // IANA zone, e.g. "Asia/Kolkata" — from Intl.DateTimeFormat().resolvedOptions().timeZone
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface AnalyticsOverview {
  totalResponses: number;
  /** Grouped by stage `category`, not the removed `status` union — same three keys, new meaning
   * (requirements.md §7.3). @deprecated alias name kept as `categoryCounts` for clarity; the old
   * `statusCounts` name is gone entirely, not kept as a second deprecated field, since every known
   * consumer is migrated in this same sprint (task 1.10). */
  categoryCounts: Record<StageCategory, number>;
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
