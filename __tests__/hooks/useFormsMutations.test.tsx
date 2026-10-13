import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/services/forms', () => ({
  formsService: { duplicateForm: vi.fn(), deleteForm: vi.fn(), archiveForm: vi.fn(), unarchiveForm: vi.fn() },
}));
vi.mock('@/services/trash', () => ({ trashService: { restore: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { trashService } from '@/services/trash';
import { useFormsMutations } from '@/hooks/useFormsMutations';
import type { Form } from '@/types/form';

const svc = formsService as unknown as Record<'duplicateForm' | 'deleteForm' | 'archiveForm' | 'unarchiveForm', ReturnType<typeof vi.fn>>;
const restore = trashService.restore as ReturnType<typeof vi.fn>;

function setup(over: Partial<Parameters<typeof useFormsMutations>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const args = {
    context: { type: 'personal' } as const,
    data: { forms: [{ _id: 'a', title: 'Alpha' }, { _id: 'b', title: 'Beta' }] as unknown as Form[] },
    page: 1,
    setPage: vi.fn(),
    setSelectedIds: vi.fn(),
    setBulkDeleteConfirming: vi.fn(),
    ...over,
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { args, invalidate, ...renderHook(() => useFormsMutations(args), { wrapper }) };
}

const lastToast = () => toast.mock.calls.at(-1)!;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('duplicateMutation', () => {
  it('tracks the duplicating id and toasts on success', async () => {
    svc.duplicateForm.mockResolvedValue({});
    const { result, invalidate } = setup();
    act(() => result.current.duplicateMutation.mutate('a'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Form duplicated successfully', 'success'));
    expect(svc.duplicateForm).toHaveBeenCalledWith('a');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['forms'] });
    await waitFor(() => expect(result.current.duplicatingId).toBeNull());
  });

  it('toasts an error on failure', async () => {
    svc.duplicateForm.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.duplicateMutation.mutate('a'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to duplicate form. Please try again.', 'error'));
  });
});

describe('deleteMutation', () => {
  it('moves to Trash, names the form, and offers Undo that restores it', async () => {
    svc.deleteForm.mockResolvedValue(undefined);
    restore.mockResolvedValue(undefined);
    const { result, invalidate } = setup({ context: { type: 'workspace', workspaceId: 'acme' } });
    act(() => result.current.deleteMutation.mutate('a'));
    await waitFor(() => expect(lastToast()[0]).toBe('"Alpha" moved to Trash'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trash'] });
    const action = lastToast()[3] as { label: string; onClick: () => void };
    expect(action.label).toBe('Undo');

    act(() => action.onClick());
    await waitFor(() => expect(restore).toHaveBeenCalledWith('acme', 'form', 'a'));
    await waitFor(() => expect(lastToast()[0]).toBe('"Alpha" restored'));
  });

  it('uses "personal" as the trash scope in personal space and reports a failed restore', async () => {
    svc.deleteForm.mockResolvedValue(undefined);
    restore.mockRejectedValue(new Error('nope'));
    const { result } = setup();
    act(() => result.current.deleteMutation.mutate('b'));
    await waitFor(() => expect(lastToast()[0]).toBe('"Beta" moved to Trash'));
    act(() => (lastToast()[3] as { onClick: () => void }).onClick());
    await waitFor(() => expect(restore).toHaveBeenCalledWith('personal', 'form', 'b'));
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
  });

  it('steps back a page when the last row on a later page is deleted', async () => {
    svc.deleteForm.mockResolvedValue(undefined);
    const { result, args } = setup({ page: 3, data: { forms: [{ _id: 'a', title: 'Alpha' }] as unknown as Form[] } });
    act(() => result.current.deleteMutation.mutate('a'));
    await waitFor(() => expect(args.setPage).toHaveBeenCalled());
    const updater = (args.setPage as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as (n: number) => number;
    expect(updater(3)).toBe(2);
  });

  it('does not change page on page 1 or when rows remain', async () => {
    svc.deleteForm.mockResolvedValue(undefined);
    const { result, args } = setup();
    act(() => result.current.deleteMutation.mutate('a'));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(args.setPage).not.toHaveBeenCalled();
  });

  it('falls back to "Form" for an unknown id and errors with a friendly toast', async () => {
    svc.deleteForm.mockResolvedValueOnce(undefined);
    const { result } = setup();
    act(() => result.current.deleteMutation.mutate('zzz'));
    await waitFor(() => expect(lastToast()[0]).toBe('"Form" moved to Trash'));

    toast.mockClear();
    svc.deleteForm.mockRejectedValueOnce(new Error('x'));
    act(() => result.current.deleteMutation.mutate('a'));
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
  });
});

describe('archiveMutation', () => {
  it('archives each id in order, clears selection and offers Undo that unarchives', async () => {
    svc.archiveForm.mockResolvedValue(undefined);
    svc.unarchiveForm.mockResolvedValue(undefined);
    const { result, args } = setup();
    act(() => result.current.archiveMutation.mutate({ ids: ['a', 'b'], archive: true }));
    await waitFor(() => expect(lastToast()[0]).toBe('2 forms archived'));
    expect(svc.archiveForm.mock.calls).toEqual([['a'], ['b']]);
    expect(args.setSelectedIds).toHaveBeenCalledWith(new Set());

    act(() => (lastToast()[3] as { onClick: () => void }).onClick());
    await waitFor(() => expect(svc.unarchiveForm.mock.calls).toEqual([['a'], ['b']]));
  });

  it('uses singular copy and the unarchive call', async () => {
    svc.unarchiveForm.mockResolvedValue(undefined);
    const { result } = setup();
    act(() => result.current.archiveMutation.mutate({ ids: ['a'], archive: false }));
    await waitFor(() => expect(lastToast()[0]).toBe('1 form unarchived'));
  });

  it('exposes archivingId while running (id for one, "*" for many)', async () => {
    let release!: () => void;
    svc.archiveForm.mockReturnValue(new Promise<void>((r) => (release = r)));
    const { result } = setup();
    act(() => result.current.archiveMutation.mutate({ ids: ['a'], archive: true }));
    await waitFor(() => expect(result.current.archivingId).toBe('a'));
    release();
    await waitFor(() => expect(result.current.archivingId).toBeNull());
  });

  it('toasts an error when the call fails', async () => {
    svc.archiveForm.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.archiveMutation.mutate({ ids: ['a'], archive: true }));
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
  });
});

describe('bulkDeleteMutation', () => {
  it('deletes sequentially, clears selection, closes confirm and offers a bulk Undo', async () => {
    svc.deleteForm.mockResolvedValue(undefined);
    restore.mockResolvedValue(undefined);
    const { result, args } = setup({ context: { type: 'workspace', workspaceId: 'acme' } });
    act(() => result.current.bulkDeleteMutation.mutate(['a', 'b']));
    await waitFor(() => expect(lastToast()[0]).toBe('2 forms moved to Trash'));
    expect(svc.deleteForm.mock.calls).toEqual([['a'], ['b']]);
    expect(args.setSelectedIds).toHaveBeenCalledWith(new Set());
    await waitFor(() => expect(args.setBulkDeleteConfirming).toHaveBeenCalledWith(false));

    act(() => (lastToast()[3] as { onClick: () => void }).onClick());
    await waitFor(() => expect(restore).toHaveBeenCalledTimes(2));
    expect(restore).toHaveBeenCalledWith('acme', 'form', 'a');
    await waitFor(() => expect(lastToast()[0]).toBe('2 forms restored'));
  });

  it('stops at the first failure, toasts and still closes the confirmation', async () => {
    svc.deleteForm.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'));
    const { result, args } = setup();
    act(() => result.current.bulkDeleteMutation.mutate(['a', 'b', 'c']));
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
    expect(svc.deleteForm).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(args.setBulkDeleteConfirming).toHaveBeenCalledWith(false));
  });
});
