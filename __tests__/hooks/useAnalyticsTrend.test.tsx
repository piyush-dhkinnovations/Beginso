import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/analytics', () => ({ analyticsService: { getTrends: vi.fn() } }));

import { analyticsService } from '@/services/analytics';
import { useAnalyticsTrend, hasTrendData } from '@/hooks/useAnalyticsTrend';

const getTrends = analyticsService.getTrends as ReturnType<typeof vi.fn>;
const pt = (bucketStart: string, responses: number) => ({ bucketStart, responses });

function setup(props: Partial<Parameters<typeof useAnalyticsTrend>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(() => useAnalyticsTrend({ bucket: 'day', formIds: ['a', 'b'], enabled: true, ...props }), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hasTrendData', () => {
  it('needs at least one non-zero bucket', () => {
    expect(hasTrendData(undefined)).toBe(false);
    expect(hasTrendData([])).toBe(false);
    expect(hasTrendData([pt('2026-10-01', 0)])).toBe(false);
    expect(hasTrendData([pt('2026-10-01', 0), pt('2026-10-02', 2)])).toBe(true);
  });
});

describe('useAnalyticsTrend', () => {
  it('makes ONE all-forms request however many forms there are, and returns the points oldest first', async () => {
    getTrends.mockResolvedValue({ points: [pt('2026-10-03', 4), pt('2026-10-01', 1)] });
    const { result } = setup({ formIds: Array.from({ length: 25 }, (_, i) => `f${i}`), from: '2026-10-01', to: '2026-10-03', scope: 'acme' });
    await waitFor(() => expect(result.current.points).toBeDefined());
    expect(result.current.points).toEqual([pt('2026-10-01', 1), pt('2026-10-03', 4)]);
    expect(result.current.isLoading).toBe(false);
    expect(getTrends).toHaveBeenCalledTimes(1);
    const [params, scope] = getTrends.mock.calls[0];
    expect(params).toEqual({ from: '2026-10-01', to: '2026-10-03', bucket: 'day', timezone: expect.any(String) });
    expect(params).not.toHaveProperty('formId');
    expect(scope).toBe('acme');
  });

  it('defaults to the personal scope', async () => {
    getTrends.mockResolvedValue({ points: [pt('2026-10-01', 1)] });
    const { result } = setup();
    await waitFor(() => expect(result.current.points).toBeDefined());
    expect(getTrends.mock.calls[0][1]).toBe('personal');
  });

  it('returns undefined points when there is no data at all (nothing fabricated)', async () => {
    getTrends.mockResolvedValue({ points: [pt('2026-10-01', 0)] });
    const { result } = setup();
    await waitFor(() => expect(getTrends).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.points).toBeUndefined();
  });

  it('is idle when disabled or when there are no forms', () => {
    expect(setup({ enabled: false }).result.current).toEqual({ points: undefined, isLoading: false });
    expect(setup({ formIds: [] }).result.current).toEqual({ points: undefined, isLoading: false });
    expect(getTrends).not.toHaveBeenCalled();
  });

  it('reports loading while the request is in flight', () => {
    getTrends.mockReturnValue(new Promise(() => {}));
    expect(setup().result.current).toEqual({ points: undefined, isLoading: true });
  });
});
