/**
 * Analytics numbers read from REAL API responses, not hand-written shapes (agreed after the respondent-name bug).
 * The JSON under __tests__/fixtures/analytics/ was captured from the live API on 16 Oct 2026 (QA personal workspace).
 * Those forms had no responses at capture time, so the "answered" fixtures below take the captured question object
 * and fill in only the counts - every key and nesting level is the live one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import questionsReal from '../fixtures/analytics/questions.real.json';
import overviewReal from '../fixtures/analytics/overview.real.json';
import formsReal from '../fixtures/analytics/forms.real.json';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), interceptors: { response: { use: vi.fn() } } } }));

import axiosInstance from '@/lib/axios';
import { analyticsService } from '@/services/analytics';
import { computeOptionPercentages } from '@/components/analytics/QuestionBreakdownChart';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

beforeEach(() => mockGet.mockReset());

describe('questions: a multi-select answered by 2 people who ticked everything', () => {
  it('shows the API share of answerers (100% each here), not a share of the ticks', async () => {
    const body = clone(questionsReal.body);
    const dropdown = body.data.questions.find((q: any) => q.type === 'dropdown') as any;
    dropdown.type = 'checkbox';
    dropdown.totalAnswered = 2;
    dropdown.summary.options = ['Design', 'Dev', 'Ops'].map((label) => ({ label, count: 2, percentage: 100 }));
    mockGet.mockResolvedValue({ data: body });

    const { questions } = await analyticsService.getQuestions({}, 'personal');
    const q = questions.find((x) => x.fieldId === dropdown.fieldId)!;
    expect(q.totalAnswered).toBe(2);
    expect(q.options.map((o) => o.percentage)).toEqual([100, 100, 100]);
    expect(computeOptionPercentages(q.options, q.totalAnswered).map((o) => o.percentage)).toEqual([100, 100, 100]);
  });

  it('keeps the live shape for an unanswered question (no options answered, no division by zero)', async () => {
    mockGet.mockResolvedValue({ data: clone(questionsReal.body) });
    const { questions } = await analyticsService.getQuestions({}, 'personal');
    const dropdown = questions.find((q) => q.type === 'dropdown')!;
    expect(dropdown.totalAnswered).toBe(0);
    expect(computeOptionPercentages(dropdown.options, dropdown.totalAnswered).every((o) => o.percentage === 0)).toBe(true);
  });
});

describe('overview: the live completion-rate fields', () => {
  it('carries views and a 0 rate through unchanged (0 responses, 1 view is a real 0%, not a dash)', async () => {
    mockGet.mockResolvedValue({ data: clone(overviewReal.body) });
    const overview = await analyticsService.getOverview({}, 'personal');
    expect(overview.views).toBe(1);
    expect(overview.completionRate).toBe(0);
    expect(overview.totalResponses).toBe(0);
  });

  it('the forms list keeps null rates and null views as null', async () => {
    mockGet.mockResolvedValue({ data: clone(formsReal.body) });
    const result = await analyticsService.getFormsSummary({}, 'personal');
    const noViews = result.forms.find((f) => f.title === 'Event Registration')!;
    expect(noViews.completionRate).toBeNull();
    expect(noViews.views).toBeNull();
  });
});
