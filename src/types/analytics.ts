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
  /** Sprint 14 — present once BE 0.2 ships; null = no counted views. */
  completionRate?: number | null;
  reviewedRate?: number | null;
  views?: number | null;
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
  /** Share of the people who answered this question (0-100), as computed by the API. Multi-select options can add up to more than 100. */
  percentage?: number;
}

export interface QuestionBreakdown {
  fieldId: string;
  label: string;
  type?: string;
  /** People who answered this question; the denominator for every option percentage. */
  totalAnswered?: number;
  options: QuestionOption[];
}

export interface AnalyticsFormSummary {
  _id: string;
  title: string;
  status: 'draft' | 'published' | 'closed';
  totalResponses: number;
  /** Sprint 14 (B5.4, OQ-3): submissions ÷ views, 0-100, or null when no views were counted. Never
   * defaulted to 0 — the UI shows "—". */
  completionRate: number | null;
  /** Counted (non-preview) views; null = not tracked. */
  views?: number | null;
  /** The old stage-based figure, renamed (OQ-3). Uncertain until BE 0.2 ships. */
  reviewedRate?: number | null;
  /** Source template category, null for forms not created from a template (BE 0.4). */
  templateCategory?: string | null;
}

export interface AnalyticsFormsSummaryResult {
  forms: AnalyticsFormSummary[];
  total: number;
  page: number;
  limit: number;
}
