/**
 * __tests__/services/analytics.service.test.ts
 * Feature: sprint-5-analytics-reports
 * Tests: analyticsService — getOverview, getTrends, getQuestions, getFormsSummary
 * Requirements: 14.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  return {
    default: {
      get: mockGet,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { analyticsService } from '@/services/analytics';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

describe('analyticsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('getOverview calls GET /api/analytics/overview with params and unwraps the live {success, data} envelope', async () => {
    // Real backend shape, confirmed live 12 Aug 2026 — flat completed/in_progress/new fields
    // under `data`, plus a redundant `statusDistribution`/`completionRate` this app ignores
    // (not the originally-assumed bare {totalResponses, statusCounts} shape).
    const raw = {
      success: true,
      data: {
        formId: 'form-1',
        total: 3,
        completed: 0,
        in_progress: 0,
        new: 3,
        completionRate: 0,
        statusDistribution: [
          { status: 'completed', count: 0, percentage: 0 },
          { status: 'in_progress', count: 0, percentage: 0 },
          { status: 'new', count: 3, percentage: 100 },
        ],
        dateRange: { from: '2026-07-13T00:00:00.000Z', to: '2026-08-11T23:59:59.999Z', timezone: 'Asia/Calcutta' },
      },
    };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await analyticsService.getOverview({ formId: 'form-1', from: '2026-08-01', to: '2026-08-10' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/overview', {
      params: { formId: 'form-1', from: '2026-08-01', to: '2026-08-10' },
    });
    expect(result).toEqual({ totalResponses: 3, categoryCounts: { new: 3, in_progress: 0, completed: 0 } });
  });

  it('getTrends calls GET /api/analytics/trends with params and reads bucket out of dateRange', async () => {
    // Real backend shape, confirmed live 12 Aug 2026 — `bucket` lives under `dateRange.bucket`,
    // not top-level as originally assumed; `points` is top-level (not wrapped in `data`).
    const raw = {
      success: true,
      points: [{ bucketStart: '2026-08-11', responses: 3 }],
      dateRange: { from: '2026-07-13T00:00:00.000Z', to: '2026-08-11T23:59:59.999Z', timezone: 'Asia/Calcutta', bucket: 'day' as const },
    };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await analyticsService.getTrends({ formId: 'form-1', bucket: 'day' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/trends', { params: { formId: 'form-1', bucket: 'day' } });
    expect(result).toEqual({ bucket: 'day', points: [{ bucketStart: '2026-08-11', responses: 3 }] });
  });

  it('getQuestions calls GET /api/analytics/questions with params and maps summary.options into {option, count}', async () => {
    // Real backend shape, confirmed live 12 Aug 2026 — wrapped in {success, data}, one entry per
    // field (including free-text fields this app filters out client-side by type), options keyed
    // `label` under `summary.options` rather than the originally-assumed flat {option, count}[].
    const raw = {
      success: true,
      data: {
        formId: 'form-1',
        totalResponses: 3,
        questions: [
          { fieldId: 'f0', label: 'Attendee Name', type: 'short_text', totalAnswered: 0, responseRate: 0, summary: { text: { sampleAnswers: [] } } },
          {
            fieldId: 'f1',
            label: 'Ticket Type',
            type: 'multiple_choice',
            totalAnswered: 3,
            responseRate: 100,
            summary: { options: [{ label: 'VIP', count: 2, percentage: 67 }, { label: 'Student', count: 1, percentage: 33 }] },
          },
        ],
        dateRange: { from: '2026-07-13T00:00:00.000Z', to: '2026-08-11T23:59:59.999Z', timezone: 'Asia/Calcutta' },
      },
    };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await analyticsService.getQuestions({ formId: 'form-1' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/questions', { params: { formId: 'form-1' } });
    expect(result).toEqual({
      questions: [
        { fieldId: 'f0', label: 'Attendee Name', options: [] },
        { fieldId: 'f1', label: 'Ticket Type', options: [{ option: 'VIP', count: 2 }, { option: 'Student', count: 1 }] },
      ],
    });
  });

  it('getFormsSummary calls GET /api/analytics/forms with params and unwraps the live {success, data} envelope', async () => {
    // Real backend shape, confirmed live 12 Aug 2026 — wrapped in {success, data}, each item
    // keyed formId (not the originally-assumed bare {forms}/_id shape).
    const raw = {
      success: true,
      data: [
        { formId: '6a7ac7717b99397f828e235b', title: 'Event Registration', status: 'published', totalResponses: 3, completionRate: 82, updatedAt: '2026-08-11T06:55:50.852Z' },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockGet.mockResolvedValueOnce({ data: raw });

    const result = await analyticsService.getFormsSummary({ page: 1, limit: 20 });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/forms', { params: { page: 1, limit: 20 } });
    expect(result).toEqual({
      forms: [{ _id: '6a7ac7717b99397f828e235b', title: 'Event Registration', status: 'published', totalResponses: 3, completionRate: 82 }],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('getFormsSummary maps an empty data array to an empty forms list', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: [], total: 0, page: 1, limit: 20, totalPages: 0 } });

    const result = await analyticsService.getFormsSummary({ page: 1, limit: 20 });

    expect(result).toEqual({ forms: [], total: 0, page: 1, limit: 20 });
  });
});
