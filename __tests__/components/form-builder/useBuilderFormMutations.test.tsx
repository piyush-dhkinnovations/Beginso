import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/forms', () => ({ formsService: { closeForm: vi.fn(), deleteForm: vi.fn() } }));
vi.mock('@/services/trash', () => ({ trashService: { restore: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { trashService } from '@/services/trash';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderFormMutations } from '@/components/form-builder/useBuilderFormMutations';
import type { Form } from '@/types/form';

const closeForm = formsService.closeForm as ReturnType<typeof vi.fn>;
const deleteForm = formsService.deleteForm as ReturnType<typeof vi.fn>;
const restore = trashService.restore as ReturnType<typeof vi.fn>;

function setup(slug: string | undefined = undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(['form', 'f1'], { _id: 'f1', status: 'published' } as Form);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { queryClient, ...renderHook(() => useBuilderFormMutations({ formWorkspaceSlug: slug, formsListHref: slug ? `/w/${slug}/forms` : '/forms' }), { wrapper }) };
}
const lastToast = () => toast.mock.calls.at(-1)!;

beforeEach(() => {
  vi.clearAllMocks();
  useBuilderStore.setState({ formId: 'f1', formTitle: 'Survey', status: 'published' });
});

describe('close flow', () => {
  it('toggles the modal flags', () => {
    const { result } = setup();
    act(() => result.current.setShowCloseModal(true));
    act(() => result.current.setShowDeleteModal(true));
    expect(result.current.showCloseModal).toBe(true);
    expect(result.current.showDeleteModal).toBe(true);
  });

  it('closes the form, updates store and cache, hides the modal and toasts', async () => {
    closeForm.mockResolvedValue({});
    const { result, queryClient } = setup();
    act(() => result.current.setShowCloseModal(true));
    act(() => result.current.closeMutation.mutate());
    await waitFor(() => expect(useBuilderStore.getState().status).toBe('closed'));
    expect(closeForm).toHaveBeenCalledWith('f1');
    expect(queryClient.getQueryData<Form>(['form', 'f1'])!.status).toBe('closed');
    await waitFor(() => expect(result.current.showCloseModal).toBe(false));
    expect(lastToast()).toEqual(['Form closed. It will no longer accept new responses.', 'success']);
  });

  it('toasts an error and leaves the form open when closing fails', async () => {
    closeForm.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.setShowCloseModal(true));
    act(() => result.current.closeMutation.mutate());
    await waitFor(() => expect(lastToast()).toEqual(['Failed to close form. Please try again.', 'error']));
    expect(useBuilderStore.getState().status).toBe('published');
    expect(result.current.showCloseModal).toBe(true);
  });
});

describe('delete flow', () => {
  it('moves the form to Trash, navigates to the list and offers Undo with the workspace scope', async () => {
    deleteForm.mockResolvedValue(undefined);
    restore.mockResolvedValue(undefined);
    const { result, queryClient } = setup('acme');
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    act(() => result.current.deleteMutation.mutate());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/w/acme/forms'));
    expect(deleteForm).toHaveBeenCalledWith('f1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['forms'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trash'] });
    expect(lastToast()[0]).toBe('"Survey" moved to Trash');

    act(() => (lastToast()[3] as { onClick: () => void }).onClick());
    await waitFor(() => expect(restore).toHaveBeenCalledWith('acme', 'form', 'f1'));
    await waitFor(() => expect(lastToast()).toEqual(['"Survey" restored', 'success']));
  });

  it('uses the personal scope without a workspace slug and reports a failed restore', async () => {
    deleteForm.mockResolvedValue(undefined);
    restore.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.deleteMutation.mutate());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/forms'));
    act(() => (lastToast()[3] as { onClick: () => void }).onClick());
    await waitFor(() => expect(restore).toHaveBeenCalledWith('personal', 'form', 'f1'));
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
  });

  it('stays put and toasts when deletion fails', async () => {
    deleteForm.mockRejectedValue(new Error('x'));
    const { result } = setup();
    act(() => result.current.deleteMutation.mutate());
    await waitFor(() => expect(lastToast()[1]).toBe('error'));
    expect(push).not.toHaveBeenCalled();
  });
});
