import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { dashboardService } from '@/services/dashboard';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

function activity(index: number) {
  return {
    id: `activity-${index}`,
    type: 'response_submitted',
    occurredAt: `2026-08-0${index + 1}T12:00:00.000Z`,
    form: { _id: `form-${index}`, title: `Form ${index}` },
    responseId: `response-${index}`,
  };
}

describe('dashboardService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('unwraps the analytics envelope and keeps at most five activities', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        analytics: {
          totalForms: 12,
          publishedForms: 8,
          totalResponses: 154,
          responsesThisMonth: 42,
          recentActivity: Array.from({ length: 6 }, (_, index) => activity(index)),
          formsBreakdown: [{ ignored: true }],
        },
      },
    });

    const result = await dashboardService.getAnalytics();

    expect(mockGet).toHaveBeenCalledWith('/api/dashboard/analytics');
    expect(result).toEqual({
      totalForms: 12,
      publishedForms: 8,
      totalResponses: 154,
      responsesThisMonth: 42,
      recentActivity: Array.from({ length: 5 }, (_, index) => activity(index)),
    });
  });

  it('rejects a missing or malformed analytics payload', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        analytics: {
          totalForms: 1,
          publishedForms: 1,
          totalResponses: 1,
          responsesThisMonth: null,
          recentActivity: [],
        },
      },
    });

    await expect(dashboardService.getAnalytics()).rejects.toThrow('Invalid dashboard analytics response');
  });
});
