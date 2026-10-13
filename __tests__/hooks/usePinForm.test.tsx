import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/forms', () => ({ formsService: { pinForm: vi.fn(), unpinForm: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { usePinForm, PIN_LIMIT } from '@/hooks/usePinForm';
import { formKeys } from '@/lib/queryKeys';
import type { Form } from '@/types/form';

const pinForm = formsService.pinForm as ReturnType<typeof vi.fn>;
const unpinForm = formsService.unpinForm as ReturnType<typeof vi.fn>;

const form = (id: string, pinned = false) => ({ _id: id, pinned, pinnedAt: pinned ? 'old' : null }) as unknown as Form;
const list = (forms: Form[]) => ({ forms, total: forms.length, page: 1, limit: 10 });

const allKey = ['forms', 'personal', 'list', { page: 1 }] as const;
const pinnedKey = ['forms', 'personal', 'list', { pinned: true }] as const;

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(allKey, list([form('a'), form('b', true)]));
  queryClient.setQueryData(pinnedKey, list([form('b', true)]));
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => usePinForm(), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePinForm', () => {
  it('optimistically marks the form pinned in every list and calls pinForm', async () => {
    let release!: () => void;
    pinForm.mockReturnValue(new Promise<void>((r) => (release = r)));
    const { result, queryClient } = setup();

    act(() => result.current.mutate({ id: 'a', pin: true }));
    await waitFor(() => {
      const data = queryClient.getQueryData<ReturnType<typeof list>>(allKey)!;
      expect(data.forms[0]).toMatchObject({ _id: 'a', pinned: true });
      expect(data.forms[0].pinnedAt).toEqual(expect.any(String));
    });
    expect(pinForm).toHaveBeenCalledWith('a');
    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('unpinning removes the form from a pinned list and decrements its total', async () => {
    unpinForm.mockResolvedValue(undefined);
    const { result, queryClient } = setup();
    // freeze refetch so we can inspect the optimistic state
    queryClient.setQueryDefaults(['forms'], { queryFn: () => new Promise(() => {}) });

    act(() => result.current.mutate({ id: 'b', pin: false }));
    await waitFor(() => expect(unpinForm).toHaveBeenCalledWith('b'));
    const pinned = queryClient.getQueryData<ReturnType<typeof list>>(pinnedKey)!;
    expect(pinned.forms).toEqual([]);
    expect(pinned.total).toBe(0);
    expect(queryClient.getQueryData<ReturnType<typeof list>>(allKey)!.forms[1]).toMatchObject({ _id: 'b', pinned: false, pinnedAt: null });
  });

  it('patches the overview cache too', async () => {
    pinForm.mockResolvedValue(undefined);
    const { result, queryClient } = setup();
    queryClient.setQueryData(formKeys.overview('a'), { form: form('a'), stats: {} });
    act(() => result.current.mutate({ id: 'a', pin: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<{ form: Form }>(formKeys.overview('a'))!.form.pinned).toBe(true);
  });

  it('rolls back and toasts when the server rejects', async () => {
    pinForm.mockRejectedValue({ response: { status: 409 } });
    const { result, queryClient } = setup();
    queryClient.setQueryDefaults(['forms'], { queryFn: () => new Promise(() => {}) });
    act(() => result.current.mutate({ id: 'a', pin: true }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith('Archived or deleted forms cannot be pinned.', 'error');
    expect(queryClient.getQueryData<ReturnType<typeof list>>(allKey)!.forms[0]).toMatchObject({ _id: 'a', pinned: false });
  });

  it.each([
    [{ response: { status: 400, data: { code: 'PIN_LIMIT' } } }, true, `You can pin up to ${PIN_LIMIT} forms. Unpin one to pin another.`],
    [{ response: { status: 400, data: { error: { code: 'PIN_LIMIT' } } } }, true, `You can pin up to ${PIN_LIMIT} forms. Unpin one to pin another.`],
    [{ response: { status: 403 } }, true, "You don't have access to this form."],
    [{ response: { status: 404, data: { code: 'FORM_NOT_FOUND' } } }, true, 'This form no longer exists.'],
    [{ response: { status: 404 } }, true, 'Could not pin this form. Please try again.'],
    [{ response: { status: 500 } }, true, 'Could not pin the form. Please try again.'],
    [new Error('net'), false, 'Could not unpin the form. Please try again.'],
  ])('error message for %j', async (err, pin, message) => {
    (pin ? pinForm : unpinForm).mockRejectedValue(err);
    const { result } = setup();
    act(() => result.current.mutate({ id: 'a', pin }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(message, 'error'));
  });
});
