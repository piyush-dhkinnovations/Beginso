import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/forms/f1/inbox',
  useSearchParams: () => new URLSearchParams(search),
}));
vi.mock('@/services/responses', () => ({ responsesService: { getResponses: vi.fn() } }));

import { responsesService } from '@/services/responses';
import { useResponseRouting } from '@/components/responses/useResponseRouting';
import type { IResponse } from '@/types/response';

const getResponses = responsesService.getResponses as ReturnType<typeof vi.fn>;
const resp = (id: string) => ({ _id: id, formId: 'f1' }) as unknown as IResponse;

type Opts = Parameters<typeof useResponseRouting>[0];
const opts = (o: Partial<Opts> = {}): Opts => ({
  scope: 'acme',
  formId: 'f1',
  filters: { stageId: 's1' },
  page: 2,
  pageLimit: 50,
  data: { data: [resp('a'), resp('b'), resp('c')], totalPages: 3, total: 150 },
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
});

describe('useResponseRouting', () => {
  it('has no active response without ?responseId', () => {
    const { result } = renderHook(() => useResponseRouting(opts()));
    expect(result.current.responseId).toBeNull();
    expect(result.current.activeResponsePosition).toBeUndefined();
    expect(result.current.responses).toHaveLength(3);
  });

  it('computes the absolute position across pages', () => {
    search = 'responseId=b';
    const { result } = renderHook(() => useResponseRouting(opts()));
    expect(result.current.responseId).toBe('b');
    expect(result.current.activeResponsePosition).toBe(52); // (2-1)*50 + index 1 + 1
  });

  it('has no position when the response is not on the loaded page', () => {
    search = 'responseId=zzz';
    expect(renderHook(() => useResponseRouting(opts())).result.current.activeResponsePosition).toBeUndefined();
  });

  it('tolerates missing data', () => {
    search = 'responseId=a';
    const { result } = renderHook(() => useResponseRouting(opts({ data: undefined })));
    expect(result.current.responses).toEqual([]);
  });

  it('openResponse pushes (so back closes the drawer) and keeps other params', () => {
    search = 'page=2&stage=s1';
    const { result } = renderHook(() => useResponseRouting(opts()));
    act(() => result.current.openResponse('c'));
    expect(push).toHaveBeenCalledWith('/forms/f1/inbox?page=2&stage=s1&responseId=c');
    expect(replace).not.toHaveBeenCalled();
  });

  it('closeResponse replaces without responseId', () => {
    search = 'page=2&responseId=a';
    const { result } = renderHook(() => useResponseRouting(opts()));
    act(() => result.current.closeResponse());
    expect(replace).toHaveBeenCalledWith('/forms/f1/inbox?page=2');
  });

  it('navigates to the next/previous response on the same page', async () => {
    search = 'responseId=b&page=2';
    const { result } = renderHook(() => useResponseRouting(opts()));
    await act(() => result.current.navigateResponse('next'));
    expect(replace).toHaveBeenLastCalledWith('/forms/f1/inbox?responseId=c&page=2');
    await act(() => result.current.navigateResponse('previous'));
    expect(replace).toHaveBeenLastCalledWith('/forms/f1/inbox?responseId=a&page=2');
    expect(getResponses).not.toHaveBeenCalled();
  });

  it('steps to the neighbouring page in the same order as the table: oldest first sends order=asc (QA D8-006)', async () => {
    search = 'responseId=c&page=2';
    getResponses.mockResolvedValue({ data: [resp('d'), resp('e')] });
    const { result } = renderHook(() => useResponseRouting(opts({ submittedOrder: 'asc' })));
    await act(() => result.current.navigateResponse('next'));
    expect(getResponses).toHaveBeenCalledWith({ formId: 'f1', stageId: 's1', order: 'asc', page: 3, limit: 50 }, 'acme');
  });

  it('fetches the next page when moving past the last row', async () => {
    search = 'responseId=c&page=2';
    getResponses.mockResolvedValue({ data: [resp('d'), resp('e')] });
    const { result } = renderHook(() => useResponseRouting(opts()));
    await act(() => result.current.navigateResponse('next'));
    expect(getResponses).toHaveBeenCalledWith({ formId: 'f1', stageId: 's1', page: 3, limit: 50 }, 'acme');
    expect(replace).toHaveBeenCalledWith('/forms/f1/inbox?responseId=d&page=3');
  });

  it('fetches the previous page and lands on its last row', async () => {
    search = 'responseId=a&page=2';
    getResponses.mockResolvedValue({ data: [resp('x'), resp('y')] });
    const { result } = renderHook(() => useResponseRouting(opts()));
    await act(() => result.current.navigateResponse('previous'));
    expect(getResponses).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }), 'acme');
    expect(replace).toHaveBeenCalledWith('/forms/f1/inbox?responseId=y&page=1');
  });

  it('does nothing past the first or last page', async () => {
    search = 'responseId=a&page=1';
    const first = renderHook(() => useResponseRouting(opts({ page: 1 })));
    await act(() => first.result.current.navigateResponse('previous'));
    search = 'responseId=c&page=3';
    const last = renderHook(() => useResponseRouting(opts({ page: 3 })));
    await act(() => last.result.current.navigateResponse('next'));
    expect(getResponses).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does nothing when the adjacent page is empty or the active response is unknown', async () => {
    search = 'responseId=c&page=2';
    getResponses.mockResolvedValue({ data: [] });
    const a = renderHook(() => useResponseRouting(opts()));
    await act(() => a.result.current.navigateResponse('next'));
    expect(replace).not.toHaveBeenCalled();

    search = 'responseId=nope';
    const b = renderHook(() => useResponseRouting(opts()));
    await act(() => b.result.current.navigateResponse('next'));
    expect(replace).not.toHaveBeenCalled();
  });

  it('expandResponse opens the full page with form, scope and a return link', () => {
    search = 'page=2&responseId=b';
    const { result } = renderHook(() => useResponseRouting(opts()));
    act(() => result.current.expandResponse(resp('b')));
    const url = push.mock.calls[0][0] as string;
    expect(url.startsWith('/inbox/b?')).toBe(true);
    const p = new URLSearchParams(url.split('?')[1]);
    expect(p.get('formId')).toBe('f1');
    expect(p.get('scope')).toBe('acme');
    expect(p.get('returnTo')).toBe('/forms/f1/inbox?page=2&responseId=b');
  });
});
