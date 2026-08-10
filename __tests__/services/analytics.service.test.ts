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

  it('getOverview calls GET /api/analytics/overview with params and returns the payload', async () => {
    const payload = { totalResponses: 10, statusCounts: { new: 4, in_progress: 3, completed: 3 } };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await analyticsService.getOverview({ formId: 'form-1', from: '2026-08-01', to: '2026-08-10' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/overview', {
      params: { formId: 'form-1', from: '2026-08-01', to: '2026-08-10' },
    });
    expect(result).toEqual(payload);
  });

  it('getTrends calls GET /api/analytics/trends with params including bucket', async () => {
    const payload = { bucket: 'day', points: [{ bucketStart: '2026-08-01T00:00:00.000Z', responses: 3 }] };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await analyticsService.getTrends({ formId: 'form-1', bucket: 'day' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/trends', { params: { formId: 'form-1', bucket: 'day' } });
    expect(result).toEqual(payload);
  });

  it('getQuestions calls GET /api/analytics/questions with params', async () => {
    const payload = { questions: [] };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await analyticsService.getQuestions({ formId: 'form-1' });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/questions', { params: { formId: 'form-1' } });
    expect(result).toEqual(payload);
  });

  it('getFormsSummary calls GET /api/analytics/forms with params', async () => {
    const payload = { forms: [], total: 0, page: 1, limit: 50 };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await analyticsService.getFormsSummary({ page: 1, limit: 50 });

    expect(mockGet).toHaveBeenCalledWith('/api/analytics/forms', { params: { page: 1, limit: 50 } });
    expect(result).toEqual(payload);
  });
});
