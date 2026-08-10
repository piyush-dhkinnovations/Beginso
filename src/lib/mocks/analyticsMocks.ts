/**
 * Mock fixtures for Analytics (Sprint 5) — unblocks frontend work while
 * `GET /api/analytics/*` is not yet confirmed live (see requirements.md §15).
 * Same factory-with-overrides shape as `responsesMocks.ts`.
 */

import type {
  AnalyticsOverview,
  AnalyticsTrendResult,
  AnalyticsTrendPoint,
  QuestionBreakdown,
  AnalyticsFormsSummaryResult,
  AnalyticsFormSummary,
} from '@/types/analytics';

export function mockAnalyticsOverview(overrides: Partial<AnalyticsOverview> = {}): AnalyticsOverview {
  return {
    totalResponses: 128,
    statusCounts: { new: 42, in_progress: 36, completed: 50 },
    ...overrides,
  };
}

export function mockAnalyticsTrends(overrides: Partial<AnalyticsTrendResult> = {}): AnalyticsTrendResult {
  const points: AnalyticsTrendPoint[] = [
    { bucketStart: '2026-07-14T00:00:00.000Z', responses: 4 },
    { bucketStart: '2026-07-21T00:00:00.000Z', responses: 9 },
    { bucketStart: '2026-07-28T00:00:00.000Z', responses: 6 },
    { bucketStart: '2026-08-04T00:00:00.000Z', responses: 14 },
    { bucketStart: '2026-08-11T00:00:00.000Z', responses: 21 },
  ];
  return { bucket: 'week', points, ...overrides };
}

export function mockQuestionBreakdown(overrides: Partial<QuestionBreakdown>[] = []): { questions: QuestionBreakdown[] } {
  const base: QuestionBreakdown[] = [
    {
      fieldId: 'field-1',
      label: 'How did you hear about us?',
      options: [
        { option: 'Social media', count: 34 },
        { option: 'Friend referral', count: 22 },
        { option: 'Search engine', count: 15 },
        { option: 'Other', count: 5 },
      ],
    },
    {
      fieldId: 'field-2',
      label: 'Preferred contact method',
      options: [
        { option: 'Email', count: 40 },
        { option: 'Phone', count: 12 },
      ],
    },
  ];
  const questions = overrides.length
    ? base.map((q, i) => ({ ...q, ...overrides[i] }))
    : base;
  return { questions };
}

export function mockFormsSummary(overrides: Partial<AnalyticsFormsSummaryResult> = {}): AnalyticsFormsSummaryResult {
  const forms: AnalyticsFormSummary[] = [
    { _id: 'form-1', title: 'Customer Feedback Survey', status: 'published', totalResponses: 128, trend: [4, 9, 6, 14, 21] },
    { _id: 'form-2', title: 'Event Registration', status: 'published', totalResponses: 76, trend: [2, 3, 5, 4, 8] },
    { _id: 'form-3', title: 'Job Application Form', status: 'closed', totalResponses: 41, trend: [6, 6, 5, 3, 1] },
    { _id: 'form-4', title: 'Product Waitlist', status: 'draft', totalResponses: 0, trend: [0, 0, 0, 0, 0] },
    { _id: 'form-5', title: 'NPS Check-in', status: 'published', totalResponses: 19, trend: [1, 0, 4, 2, 3] },
  ];
  return { forms, total: forms.length, page: 1, limit: 50, ...overrides };
}
