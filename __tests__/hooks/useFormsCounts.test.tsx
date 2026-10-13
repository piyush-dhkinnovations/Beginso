import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/forms', () => ({ formsService: { getForms: vi.fn() } }));

import { formsService } from '@/services/forms';
import { useFormsCounts } from '@/hooks/useFormsCounts';
import type { Form } from '@/types/form';

const getForms = formsService.getForms as ReturnType<typeof vi.fn>;
const ctx = { type: 'personal' } as const;
const f = (id: string, status: string, updatedAt = '2026-10-01T00:00:00Z') => ({ _id: id, status, updatedAt }) as unknown as Form;

function setup(data: { forms: Form[]; total: number } | undefined, tab: Parameters<typeof useFormsCounts>[2] = 'recent', search = '') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return renderHook(() => useFormsCounts(ctx, data, tab, search), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('useFormsCounts - everything loaded', () => {
  it('counts from the loaded list without any request', () => {
    const forms = [f('1', 'published'), f('2', 'draft'), f('3', 'closed', '2026-10-12T10:00:00Z')];
    const { result } = setup({ forms, total: 3 });
    expect(getForms).not.toHaveBeenCalled();
    expect(result.current.allCount).toBe(3);
    expect(result.current.tabCounts).toMatchObject({ recent: 3, published: 1, draft: 1, closed: 1 });
    expect(result.current.headerFacts).toBe('3 forms · 1 live · 1 draft · last edited 2 hours ago');
  });

  it('uses singular nouns', () => {
    const { result } = setup({ forms: [f('1', 'draft', '2026-10-12T11:59:50Z')], total: 1 });
    expect(result.current.headerFacts).toBe('1 form · 0 live · 1 draft · last edited just now');
  });

  it('says "0 forms" when empty', () => {
    const { result } = setup({ forms: [], total: 0 });
    expect(result.current.headerFacts).toBe('0 forms');
    expect(result.current.tabCounts.closed).toBe(0);
  });
});

describe('useFormsCounts - paged lists', () => {
  it('has no counts before the list has loaded and sends no requests', () => {
    const { result } = setup(undefined);
    expect(getForms).not.toHaveBeenCalled();
    expect(result.current.allCount).toBeUndefined();
    expect(result.current.headerFacts).toBeUndefined();
  });

  it('reads totals with limit=1 requests when the list is partial', async () => {
    getForms.mockImplementation(async (p: { status?: string; archived?: string }) => ({
      forms: [],
      total: p.archived === 'only' ? 2 : p.status === 'published' ? 4 : p.status === 'draft' ? 3 : 10,
    }));
    const { result } = setup({ forms: [f('1', 'draft')], total: 10 });
    await waitFor(() => expect(result.current.tabCounts.closed).toBe(3));
    expect(result.current.tabCounts).toMatchObject({ recent: 10, published: 4, draft: 3, closed: 3, archived: 2 });
    for (const [params, context] of getForms.mock.calls) {
      expect(params).toMatchObject({ page: 1, limit: 1 });
      expect(context).toEqual(ctx);
    }
    // "last edited" is only honest when every form is loaded.
    expect(result.current.headerFacts).toBe('10 forms · 4 live · 3 drafts');
  });

  it('never reports a negative closed count', async () => {
    getForms.mockImplementation(async (p: { status?: string }) => ({ forms: [], total: p.status ? 5 : 3 }));
    const { result } = setup({ forms: [f('1', 'draft')], total: 9 });
    await waitFor(() => expect(result.current.tabCounts.closed).toBe(0));
  });

  it('queries instead of counting locally while a search is active or off the Recent tab', async () => {
    getForms.mockResolvedValue({ forms: [], total: 1 });
    setup({ forms: [f('1', 'draft')], total: 1 }, 'recent', 'abc');
    await waitFor(() => expect(getForms).toHaveBeenCalled());
    getForms.mockClear();
    setup({ forms: [f('1', 'draft')], total: 1 }, 'draft');
    await waitFor(() => expect(getForms).toHaveBeenCalled());
  });
});
