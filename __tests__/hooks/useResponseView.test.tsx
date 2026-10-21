import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SAVE_FAILED_COPY, useResponseView } from '@/hooks/useResponseView';
import type { ResponseViewConfig, ResponseViewSettings } from '@/types/responseView';

const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

const svc = vi.hoisted(() => ({ get: vi.fn(), savePersonal: vi.fn(), clearPersonal: vi.fn(), saveFormDefault: vi.fn() }));
vi.mock('@/services/responseView', () => ({ responseViewService: svc }));

const GRID: ResponseViewSettings = { layout: 'grid', density: 'comfortable', showEmpty: true, showNumbers: true };
const TABLE: ResponseViewSettings = { layout: 'table', density: 'compact', showEmpty: false, showNumbers: false };
const config = (over: Partial<ResponseViewConfig> = {}): ResponseViewConfig => ({
  resolved: { ...GRID, source: 'system' },
  formDefault: null,
  personal: null,
  personalAll: null,
  ...over,
});

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const mount = (formId: string | undefined = 'f1') => renderHook(() => useResponseView({ formId, scope: 'acme' }), { wrapper });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.localStorage.clear();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  toast.mockReset();
  Object.values(svc).forEach((f) => f.mockReset());
  svc.get.mockResolvedValue(config());
  svc.savePersonal.mockResolvedValue(null);
  svc.clearPersonal.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('useResponseView: what is drawn', () => {
  it('starts on Grid with no request answered yet, then takes the server answer', async () => {
    svc.get.mockResolvedValue(config({ resolved: { ...TABLE, source: 'formDefault' } }));
    const { result } = mount();
    expect(result.current.view).toEqual(GRID);
    await waitFor(() => expect(result.current.view).toEqual(TABLE));
  });

  it('paints the choice remembered on this device first, then switches silently if the server differs', async () => {
    window.localStorage.setItem('beginso:response-view:f1', JSON.stringify(TABLE));
    svc.get.mockResolvedValue(config({ resolved: { ...GRID, layout: 'list', source: 'formDefault' } }));
    const { result } = mount();
    expect(result.current.view.layout).toBe('table');
    await waitFor(() => expect(result.current.view.layout).toBe('list'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('uses the remembered choice, or Grid, when the config request fails - never an error', async () => {
    svc.get.mockRejectedValue(new Error('500'));
    window.localStorage.setItem('beginso:response-view:f1', JSON.stringify(TABLE));
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    expect(result.current.view).toEqual(TABLE);
    expect(toast).not.toHaveBeenCalled();
  });

  it('does nothing without a form', () => {
    const { result } = renderHook(() => useResponseView({ formId: undefined, scope: 'acme' }), { wrapper });
    expect(svc.get).not.toHaveBeenCalled();
    expect(result.current.view).toEqual(GRID);
  });

  it('remembers what the server said for the next visit', async () => {
    svc.get.mockResolvedValue(config({ resolved: { ...TABLE, source: 'personal' } }));
    mount();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('beginso:response-view:f1')!)).toEqual(TABLE));
  });
});

describe('useResponseView: switching', () => {
  it('applies instantly and saves once, 500 ms after the last change', async () => {
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());

    act(() => result.current.setView({ layout: 'table' }));
    expect(result.current.view.layout).toBe('table'); // before any request
    act(() => result.current.setView({ density: 'compact' }));
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(svc.savePersonal).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2);
    });
    expect(svc.savePersonal).toHaveBeenCalledTimes(1);
    expect(svc.savePersonal).toHaveBeenCalledWith('f1', { ...GRID, layout: 'table', density: 'compact' }, 'acme');
  });

  it('never refetches the view config just because the layout changed', async () => {
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(1));
    act(() => result.current.setView({ layout: 'list' }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(svc.get).toHaveBeenCalledTimes(1);
  });

  it('saves under "all" when "Use for all my forms" is on, and under the form otherwise', async () => {
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    act(() => result.current.setUseForAll(true));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(svc.savePersonal).toHaveBeenLastCalledWith('all', GRID, 'acme');
    expect(result.current.useForAll).toBe(true);

    act(() => result.current.setView({ layout: 'list' }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(svc.savePersonal).toHaveBeenLastCalledWith('all', { ...GRID, layout: 'list' }, 'acme');
  });

  it('knows "all" is in effect from the server answer', async () => {
    svc.get.mockResolvedValue(config({ resolved: { ...TABLE, source: 'personalAll' }, personalAll: { ...TABLE, scope: 'all' } }));
    const { result } = mount();
    await waitFor(() => expect(result.current.useForAll).toBe(true));
    expect(result.current.hasPersonalChoice).toBe(true);
  });

  it('a failed save keeps the choice for the visit and on this device, with one quiet toast', async () => {
    svc.savePersonal.mockRejectedValue(new Error('500'));
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());

    act(() => result.current.setView({ layout: 'table' }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    act(() => result.current.setView({ layout: 'list' }));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(svc.savePersonal).toHaveBeenCalledTimes(2);
    expect(result.current.view.layout).toBe('list');
    expect(JSON.parse(window.localStorage.getItem('beginso:response-view:f1')!).layout).toBe('list');
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(SAVE_FAILED_COPY, 'error');
  });

  it('closing before the debounce ends still saves the choice', async () => {
    const { result, unmount } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    act(() => result.current.setView({ layout: 'table' }));
    unmount();
    await waitFor(() => expect(svc.savePersonal).toHaveBeenCalledWith('f1', { ...GRID, layout: 'table' }, 'acme'));
  });
});

describe('useResponseView: form default', () => {
  it('"Use the form\'s default" clears both personal choices and goes back to the server answer', async () => {
    svc.get.mockResolvedValueOnce(config({ resolved: { ...TABLE, source: 'personal' }, personal: { ...TABLE, scope: 'f1' } }));
    const { result } = mount();
    await waitFor(() => expect(result.current.view.layout).toBe('table'));
    svc.get.mockResolvedValue(config({ resolved: { ...GRID, source: 'formDefault' } }));

    await act(async () => {
      await result.current.useFormDefault();
    });
    expect(svc.clearPersonal).toHaveBeenCalledWith('f1', 'acme');
    expect(svc.clearPersonal).toHaveBeenCalledWith('all', 'acme');
    await waitFor(() => expect(result.current.view).toEqual(GRID));
  });

  it('sets the form default with the version it last saw (0 when there is none)', async () => {
    svc.saveFormDefault.mockResolvedValue({ ...GRID, version: 1, pinned: [], fields: [] });
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    await act(async () => {
      await result.current.setAsFormDefault();
    });
    expect(svc.saveFormDefault).toHaveBeenCalledWith('f1', GRID, 0, 'acme');
    expect(toast).toHaveBeenCalledWith("Saved as this form's default layout.", 'success');
  });

  it('sends the stored version when there already is a default', async () => {
    svc.get.mockResolvedValue(config({ formDefault: { ...GRID, version: 4, pinned: [], fields: [] } }));
    svc.saveFormDefault.mockResolvedValue({ ...GRID, version: 5, pinned: [], fields: [] });
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.setAsFormDefault();
    });
    expect(svc.saveFormDefault).toHaveBeenCalledWith('f1', GRID, 4, 'acme');
  });

  it('tells the person when someone else changed it (409) and reloads the config', async () => {
    svc.saveFormDefault.mockRejectedValue(Object.assign(new Error('stale'), { isAxiosError: true, response: { status: 409 } }));
    const { result } = mount();
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(1));
    await act(async () => {
      await result.current.setAsFormDefault();
    });
    expect(toast).toHaveBeenCalledWith('Someone else changed this default. Reload the page and try again.', 'error');
    await waitFor(() => expect(svc.get).toHaveBeenCalledTimes(2));
  });
});
