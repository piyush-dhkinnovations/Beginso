import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/forms', () => ({ formsService: { getFormById: vi.fn() } }));
vi.mock('@/services/responses', () => ({ responsesService: { getStats: vi.fn(), getResponses: vi.fn() } }));

import { formsService } from '@/services/forms';
import { responsesService } from '@/services/responses';
import { useResponsesData } from '@/components/responses/useResponsesData';

const getFormById = formsService.getFormById as ReturnType<typeof vi.fn>;
const getStats = responsesService.getStats as ReturnType<typeof vi.fn>;
const getResponses = responsesService.getResponses as ReturnType<typeof vi.fn>;

type Opts = Parameters<typeof useResponsesData>[0];
function setup(o: Partial<Opts> = {}) {
  const setPage = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const opts: Opts = { scope: 'acme', formId: 'f1', filters: { stageId: 's1' }, page: 1, pageLimit: 50, setPage, ...o };
  return { setPage, ...renderHook(() => useResponsesData(opts), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getFormById.mockResolvedValue({ _id: 'f1', fields: [] });
  getStats.mockResolvedValue({ total: 4, unread: 1, byCategory: { new: 1 } });
  getResponses.mockResolvedValue({ data: [], total: 0, totalPages: 1, page: 1, limit: 50 });
});

describe('useResponsesData', () => {
  it('loads the form, stats and list with the right arguments', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.form).toBeDefined());
    await waitFor(() => expect(result.current.stats).toBeDefined());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getFormById).toHaveBeenCalledWith('f1');
    expect(getStats).toHaveBeenCalledWith('f1', 'acme');
    expect(getResponses).toHaveBeenCalledWith({ formId: 'f1', stageId: 's1', page: 1, limit: 50 }, 'acme');
  });

  it('does not load the form without a formId (all-forms inbox)', async () => {
    const { result } = setup({ formId: undefined });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getFormById).not.toHaveBeenCalled();
    expect(result.current.form).toBeUndefined();
  });

  it('surfaces errors per query', async () => {
    getStats.mockRejectedValue(new Error('s'));
    getResponses.mockRejectedValue(new Error('r'));
    getFormById.mockRejectedValue(new Error('f'));
    const { result } = setup();
    await waitFor(() => expect(result.current.isStatsError).toBe(true));
    await waitFor(() => expect(result.current.isResponsesError).toBe(true));
    await waitFor(() => expect(result.current.isFormError).toBe(true));
  });

  it('clamps an out-of-range page back into range', async () => {
    getResponses.mockResolvedValue({ data: [], total: 100, totalPages: 2, page: 5, limit: 50 });
    const { setPage } = setup({ page: 5 });
    await waitFor(() => expect(setPage).toHaveBeenCalledWith(2));
  });

  it('clamps to page 1 when there are no pages, and leaves a valid page alone', async () => {
    getResponses.mockResolvedValue({ data: [], total: 0, totalPages: 0, page: 3, limit: 50 });
    const a = setup({ page: 3 });
    await waitFor(() => expect(a.setPage).toHaveBeenCalledWith(1));

    getResponses.mockResolvedValue({ data: [], total: 100, totalPages: 2, page: 2, limit: 50 });
    const b = setup({ page: 2 });
    await waitFor(() => expect(b.result.current.data).toBeDefined());
    expect(b.setPage).not.toHaveBeenCalled();
  });
});
