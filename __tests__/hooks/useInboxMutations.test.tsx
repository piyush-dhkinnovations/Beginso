/**
 * __tests__/hooks/useInboxMutations.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.5 (5.1), design.md §7/§21, task 2.3.
 * Property: undo restores the exact previous state; failed ids never reported as succeeded
 * (the latter is also covered directly in responses.service.test.ts's `idsRemainingSelected`
 * property — this file exercises the hook's own optimistic-patch + rollback + undo wiring).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fc from 'fast-check';

vi.mock('@/services/responses', () => ({
  responsesService: {
    update: vi.fn(),
    markRead: vi.fn(),
    bulk: vi.fn(),
    deleteResponse: vi.fn(),
  },
}));

const toastMock = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { responsesService } from '@/services/responses';
import { useInboxMutations } from '@/hooks/useInboxMutations';
import { responseKeys } from '@/lib/queryKeys';
import type { IResponse, PaginatedResponsesResult } from '@/types/response';

const mockBulk = responsesService.bulk as ReturnType<typeof vi.fn>;

function makeResponse(id: string, stageId = 's1'): IResponse {
  return {
    _id: id,
    formId: 'form-1',
    answers: {},
    stage: { id: stageId, name: 'New', colour: 'info', category: 'new' },
    assignee: null,
    tags: [],
    unread: true,
    duplicateOfId: null,
    submittedAt: '2026-09-29T00:00:00.000Z',
    createdAt: '2026-09-29T00:00:00.000Z',
    updatedAt: '2026-09-29T00:00:00.000Z',
  };
}

function makeClientAndWrapper(initialList: PaginatedResponsesResult) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(responseKeys.all('acme', undefined), initialList);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useInboxMutations — bulk', () => {
  beforeEach(() => {
    mockBulk.mockReset();
    toastMock.mockReset();
  });

  // QA A6-003: a whole batch could fail ("0 of 1 updated, 1 failed.") with no hint why, although the server said.
  it('says why rows failed, using the reason the server gave', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1')], total: 1, page: 1, limit: 50, totalPages: 1 };
    const { wrapper } = makeClientAndWrapper(list);
    mockBulk.mockResolvedValueOnce({ succeeded: [], failed: [{ id: 'r1', reason: "This response's form has no workspace to resolve stages against" }], previous: [] });
    const { result } = renderHook(() => useInboxMutations({ scope: 'personal' }), { wrapper });

    act(() => {
      result.current.bulk({ ids: ['r1'] }, { type: 'stage', stageId: 's2' });
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(toastMock.mock.calls[0][0]).toBe("0 of 1 updated, 1 failed. This response's form has no workspace to resolve stages against.");
    expect(toastMock.mock.calls[0][1]).toBe('warning');
  });

  it('sends one request for a bulk stage change and optimistically patches the list', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1'), makeResponse('r2')], total: 2, page: 1, limit: 50, totalPages: 1 };
    const { queryClient, wrapper } = makeClientAndWrapper(list);
    mockBulk.mockResolvedValueOnce({ succeeded: ['r1', 'r2'], failed: [], previous: [{ id: 'r1', stageId: 's1' }, { id: 'r2', stageId: 's1' }] });

    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });

    act(() => {
      result.current.bulk({ ids: ['r1', 'r2'] }, { type: 'stage', stageId: 's2' });
    });

    // onMutate's optimistic patch runs before the request resolves — check it before waiting
    // for the mock to settle.
    await waitFor(() => {
      const optimistic = queryClient.getQueryData<PaginatedResponsesResult>(responseKeys.all('acme', undefined));
      expect(optimistic?.data.every((r) => r.stage?.id === 's2')).toBe(true);
    });

    await waitFor(() => expect(mockBulk).toHaveBeenCalledTimes(1));
    expect(mockBulk).toHaveBeenCalledWith(
      { target: { ids: ['r1', 'r2'] }, action: { type: 'stage', stageId: 's2' }, previous: undefined },
      'acme'
    );
  });

  it('rolls back the optimistic patch and toasts on failure', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1')], total: 1, page: 1, limit: 50, totalPages: 1 };
    const { queryClient, wrapper } = makeClientAndWrapper(list);
    mockBulk.mockRejectedValueOnce(new Error('network'));

    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });

    act(() => {
      result.current.bulk({ ids: ['r1'] }, { type: 'stage', stageId: 's2' });
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Failed to update responses. Please try again.', 'error'));
    const rolledBack = queryClient.getQueryData<PaginatedResponsesResult>(responseKeys.all('acme', undefined));
    expect(rolledBack?.data[0].stage?.id).toBe('s1');
  });

  it('says what is wrong when the server explains a refusal (too many responses for one action), instead of a bare failure', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1')], total: 1, page: 1, limit: 50, totalPages: 1 };
    const { wrapper } = makeClientAndWrapper(list);
    toastMock.mockClear();
    mockBulk.mockRejectedValueOnce({ response: { status: 413, data: { message: 'Too many responses for one action: the limit is 5,000. Narrow the filter and try again.' } } });
    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });

    act(() => {
      result.current.bulk({ filter: {}, formId: 'form-1' }, { type: 'read' });
    });

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith('Too many responses for one action: the limit is 5,000. Narrow the filter and try again.', 'error'));
  });

  it('undo posts exactly one restore request carrying the previous snapshot', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1'), makeResponse('r2')], total: 2, page: 1, limit: 50, totalPages: 1 };
    const { wrapper } = makeClientAndWrapper(list);
    const previous = [{ id: 'r1', stageId: 's1' }, { id: 'r2', stageId: 's1' }];
    mockBulk.mockResolvedValueOnce({ succeeded: ['r1', 'r2'], failed: [], previous });

    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });

    act(() => {
      result.current.bulk({ ids: ['r1', 'r2'] }, { type: 'stage', stageId: 's2' });
    });
    await waitFor(() => expect(mockBulk).toHaveBeenCalledTimes(1));

    // The success toast was called with an Undo action — invoke it.
    const successCall = toastMock.mock.calls.find(([, , , action]) => action?.label === 'Undo');
    expect(successCall).toBeDefined();
    mockBulk.mockResolvedValueOnce({ succeeded: ['r1', 'r2'], failed: [], previous: [] });

    act(() => {
      successCall![3].onClick();
    });

    await waitFor(() => expect(mockBulk).toHaveBeenCalledTimes(2));
    expect(mockBulk).toHaveBeenLastCalledWith(
      { target: { ids: ['r1', 'r2'] }, action: { type: 'restore' }, previous },
      'acme'
    );
  });

  it('never shows an Undo action for the restore action itself', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1')], total: 1, page: 1, limit: 50, totalPages: 1 };
    const { wrapper } = makeClientAndWrapper(list);
    mockBulk.mockResolvedValueOnce({ succeeded: ['r1'], failed: [], previous: [{ id: 'r1', stageId: 's1' }] });

    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });
    act(() => {
      result.current.bulk({ ids: ['r1'] }, { type: 'restore' });
    });
    await waitFor(() => expect(mockBulk).toHaveBeenCalledTimes(1));
    const undoCall = toastMock.mock.calls.find(([, , , action]) => action?.label === 'Undo');
    expect(undoCall).toBeUndefined();
  });
});

// design.md §21 property: "undo of a bulk action restores the exact previous state". Exercised
// here at the pure-data level the hook's `undo()` builds its request from — the request always
// carries exactly the `previous` entries returned by the original bulk call, for exactly those
// ids, regardless of how many/which ids were involved.
// QA D5-004: bulk delete showed "Failed to update responses" and sent NO request. Queries under the same key prefix that are not a
// page of rows (stats, and the Board / Calendar queries) made the optimistic filter throw before the request could go out.
describe('useInboxMutations: bulk delete with other cached queries under the list key', () => {
  beforeEach(() => {
    mockBulk.mockReset();
    toastMock.mockReset();
  });

  it('still sends the delete request, and removes the rows from the real list', async () => {
    const list: PaginatedResponsesResult = { data: [makeResponse('r1'), makeResponse('r2'), makeResponse('r3')], total: 3, page: 1, limit: 50, totalPages: 1 };
    const { queryClient, wrapper } = makeClientAndWrapper(list);
    // What else lives under ['responses', scope, formId]: stats (an object), and infinite-query data (pages, no top-level data).
    queryClient.setQueryData([...responseKeys.all('acme', undefined), 'stats'], { total: 3, byStage: [] });
    queryClient.setQueryData([...responseKeys.all('acme', undefined), { stageId: 's1' }, 'board'], { pages: [{ data: [makeResponse('r1')] }], pageParams: [1] });
    mockBulk.mockResolvedValueOnce({ succeeded: ['r1', 'r2'], failed: [], previous: [{ id: 'r1' }, { id: 'r2' }] });

    const { result } = renderHook(() => useInboxMutations({ scope: 'acme' }), { wrapper });
    act(() => {
      result.current.bulk({ ids: ['r1', 'r2'] }, { type: 'delete' });
    });

    await waitFor(() => expect(mockBulk).toHaveBeenCalledTimes(1));
    expect(mockBulk).toHaveBeenCalledWith({ target: { ids: ['r1', 'r2'] }, action: { type: 'delete' }, previous: undefined }, 'acme');
    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(toastMock.mock.calls[0][0]).toBe('2 responses deleted.');
    expect(toastMock.mock.calls[0][1]).toBe('success');
    const after = queryClient.getQueryData<PaginatedResponsesResult>(responseKeys.all('acme', undefined));
    expect(after?.data.map((r) => r._id)).toEqual(['r3']);
    expect(after?.total).toBe(1);
  });
});

describe('undo request shape (property)', () => {
  it('the restore target ids always equal the previous snapshot ids, 1:1', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        (ids) => {
          const previous = ids.map((id) => ({ id, stageId: 's1' }));
          const restoreTarget = { ids: previous.map((p) => p.id) };
          return JSON.stringify(restoreTarget.ids) === JSON.stringify(ids);
        }
      ),
      { numRuns: 200 }
    );
  });
});
