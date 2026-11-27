/**
 * Shared TypeScript interfaces for Analytics.
 * Shapes match the backend contract in docs/backend-contract/api-reference.md §4. The status split groups
 * by workspace-defined stage `category` so a custom stage set still yields a
 * coherent three-bucket donut, rather than by the removed fixed `status` union.
 */

import type { StageCategory } from './stage';
import type { FormMark } from '@/types/form';

export interface GetAnalyticsParams {
  formId?: string;
  from?: string;   // ISO date, UTC day boundary
  to?: string;     // ISO date, UTC day boundary
  timezone?: string; // IANA zone, e.g. "Asia/Kolkata" — from Intl.DateTimeFormat().resolvedOptions().timeZone
}

export type DateRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export interface AnalyticsOverview {
  totalResponses: number;
  /** Grouped by stage `category`, not the removed `status` union — same three keys, new meaning. */
  categoryCounts: Record<StageCategory, number>;
  /** null = no counted views. */
  completionRate?: number | null;
  reviewedRate?: number | null;
  views?: number | null;
  /** One row per workspace stage that holds responses in this range (the backend leaves empty stages out). Absent on a personal form
   * (no stages) or an older backend: the card then falls back to the three categories. */
  stageCounts?: { stageId: string; name: string; category: StageCategory; count: number }[];
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
  /** Rating questions: average, top of the scale and how many gave each value. */
  rating?: { count: number; average: number; max: number; distribution: { value: number; count: number; percentage: number }[] };
  /** Number / currency questions. */
  numeric?: { count: number; average: number; min: number; max: number; sum: number };
  /** Yes/no questions: how many said each, and the share of yes. */
  yesNo?: { yes: number; no: number; percentageYes: number };
}

export interface AnalyticsFormSummary {
  _id: string;
  title: string;
  status: 'draft' | 'published' | 'closed';
  totalResponses: number;
  /** Submissions ÷ views, 0-100, or null when no views were counted. Never
   * defaulted to 0 — the UI shows "—". */
  completionRate: number | null;
  /** Counted (non-preview) views; null = not tracked. */
  views?: number | null;
  /** The old stage-based figure, renamed. */
  reviewedRate?: number | null;
  /** Source template category, null for forms not created from a template. */
  templateCategory?: string | null;
  /** The form's logo / icon, so this table shows the same mark as the Forms list. Absent on an older backend. */
  branding?: FormMark;
}

export interface AnalyticsFormsSummaryResult {
  forms: AnalyticsFormSummary[];
  total: number;
  page: number;
  limit: number;
}
