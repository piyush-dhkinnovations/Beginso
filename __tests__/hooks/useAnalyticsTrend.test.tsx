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
  it('sums per-form trends by bucket, oldest first', async () => {
    getTrends.mockImplementation(async ({ formId }: { formId: string }) => ({
      points: formId === 'a' ? [pt('2026-10-02', 3), pt('2026-10-01', 1)] : [pt('2026-10-02', 2), pt('2026-10-03', 4)],
    }));
    const { result } = setup({ from: '2026-10-01', to: '2026-10-03', scope: 'acme' });
    await waitFor(() => expect(result.current.points).toBeDefined());
    expect(result.current.points).toEqual([pt('2026-10-01', 1), pt('2026-10-02', 5), pt('2026-10-03', 4)]);
    expect(result.current.isLoading).toBe(false);
    expect(getTrends).toHaveBeenCalledTimes(2);
    expect(getTrends).toHaveBeenCalledWith(expect.objectContaining({ formId: 'a', bucket: 'day', from: '2026-10-01', to: '2026-10-03', timezone: expect.any(String) }), 'acme');
  });

  it('defaults to the personal scope', async () => {
    getTrends.mockResolvedValue({ points: [pt('2026-10-01', 1)] });
    const { result } = setup();
    await waitFor(() => expect(result.current.points).toBeDefined());
    expect(getTrends.mock.calls[0][1]).toBe('personal');
  });

  it('caps the fan-out at 10 forms', async () => {
    getTrends.mockResolvedValue({ points: [pt('2026-10-01', 1)] });
    const { result } = setup({ formIds: Array.from({ length: 15 }, (_, i) => `f${i}`) });
    await waitFor(() => expect(result.current.points).toBeDefined());
    expect(getTrends).toHaveBeenCalledTimes(10);
    expect(result.current.points).toEqual([pt('2026-10-01', 10)]);
  });

  it('ignores forms whose request fails', async () => {
    getTrends.mockImplementation(async ({ formId }: { formId: string }) => {
      if (formId === 'a') throw new Error('boom');
      return { points: [pt('2026-10-01', 2)] };
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.points).toEqual([pt('2026-10-01', 2)]));
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

  it('reports loading while requests are in flight', () => {
    getTrends.mockReturnValue(new Promise(() => {}));
    expect(setup().result.current).toEqual({ points: undefined, isLoading: true });
  });
});
