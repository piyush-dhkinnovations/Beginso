import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderPublishFlow } from '@/components/form-builder/useBuilderPublishFlow';
import type { Form } from '@/types/form';

const updateForm = formsService.updateForm as ReturnType<typeof vi.fn>;

function setup() {
  const setActiveTab = vi.fn();
  const setSaveState = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(['form', 'f1'], { _id: 'f1', status: 'draft', slug: 'old' } as Form);
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const remove = vi.spyOn(queryClient, 'removeQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  return { setActiveTab, setSaveState, queryClient, invalidate, remove, ...renderHook(() => useBuilderPublishFlow({ id: 'f1', setActiveTab, setSaveState }), { wrapper }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  useBuilderStore.setState({
    formId: 'f1',
    formTitle: 'Survey',
    fields: [{ fieldId: 'q1', pageId: 'p2', type: 'short_text', label: 'Q', deleted: false } as never],
    pages: [{ id: 'p1', order: 0 }, { id: 'p2', order: 1 }] as never,
    branding: {},
    settings: { honeypotEnabled: true },
    dirty: false,
    status: 'draft',
    activePageId: 'p1',
    activeFieldId: null,
  });
});

describe('handleStatusChange', () => {
  it('syncs the store and the cached form, and refreshes lists', () => {
    const { result, queryClient, invalidate } = setup();
    act(() => result.current.handleStatusChange('published', 'new-slug'));
    expect(useBuilderStore.getState().status).toBe('published');
    expect(useBuilderStore.getState().slug).toBe('new-slug');
    expect(queryClient.getQueryData<Form>(['form', 'f1'])).toMatchObject({ status: 'published', slug: 'new-slug' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['forms'] });
  });

  it('keeps the existing slug when none is given', () => {
    const { result, queryClient } = setup();
    act(() => result.current.handleStatusChange('closed'));
    expect(queryClient.getQueryData<Form>(['form', 'f1'])).toMatchObject({ status: 'closed', slug: 'old' });
  });
});

describe('handlePublishClick', () => {
  it('opens the dialog straight away when nothing is unsaved', async () => {
    const { result, setSaveState } = setup();
    await act(() => result.current.handlePublishClick());
    expect(updateForm).not.toHaveBeenCalled();
    expect(setSaveState).not.toHaveBeenCalled();
    expect(result.current.showPublishModal).toBe(true);
  });

  it('flushes pending edits first, then opens the dialog', async () => {
    updateForm.mockResolvedValue({});
    useBuilderStore.setState({ dirty: true });
    const { result, setSaveState } = setup();
    await act(() => result.current.handlePublishClick());
    expect(updateForm).toHaveBeenCalledWith('f1', expect.objectContaining({ title: 'Survey' }));
    expect(setSaveState.mock.calls.map((c) => c[0])).toEqual(['saving', 'saved']);
    expect(useBuilderStore.getState().dirty).toBe(false);
    expect(result.current.showPublishModal).toBe(true);
  });

  it('does not open the dialog when the save fails', async () => {
    updateForm.mockRejectedValue(new Error('x'));
    useBuilderStore.setState({ dirty: true });
    const { result, setSaveState } = setup();
    await act(() => result.current.handlePublishClick());
    expect(setSaveState).toHaveBeenLastCalledWith('error');
    expect(toast).toHaveBeenCalledWith('Could not save before publishing. Please try again.', 'error');
    expect(result.current.showPublishModal).toBe(false);
    expect(useBuilderStore.getState().dirty).toBe(true);
  });
});

describe('handlePreview', () => {
  it('drops the cached form and navigates to the preview in the same tab', async () => {
    const { result, remove } = setup();
    await act(() => result.current.handlePreview());
    expect(remove).toHaveBeenCalledWith({ queryKey: ['form', 'f1'] });
    expect(push).toHaveBeenCalledWith('/forms/f1/preview');
    expect(updateForm).not.toHaveBeenCalled();
  });

  it('saves first when dirty', async () => {
    updateForm.mockResolvedValue({});
    useBuilderStore.setState({ dirty: true });
    const { result } = setup();
    await act(() => result.current.handlePreview());
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/forms/f1/preview');
  });

  it('blocks navigation when the save fails, so edits are not lost', async () => {
    updateForm.mockRejectedValue(new Error('x'));
    useBuilderStore.setState({ dirty: true });
    const { result, remove } = setup();
    await act(() => result.current.handlePreview());
    expect(push).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Could not save your changes, so Preview was not opened. Please try again.', 'error');
  });
});

describe('pre-flight shortcuts', () => {
  it('handleChangeSetting closes the dialog and opens the Settings tab', async () => {
    const { result, setActiveTab } = setup();
    await act(() => result.current.handlePublishClick());
    act(() => result.current.handleChangeSetting());
    expect(result.current.showPublishModal).toBe(false);
    expect(setActiveTab).toHaveBeenCalledWith('settings');
  });

  it('handleFixField goes to the Build tab, activates the field and its page, and scrolls to it', async () => {
    const scroll = vi.fn();
    const el = document.createElement('div');
    el.setAttribute('data-field-id', 'q1');
    el.scrollIntoView = scroll;
    document.body.appendChild(el);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0));

    const { result, setActiveTab } = setup();
    await act(() => result.current.handlePublishClick());
    act(() => result.current.handleFixField('q1'));
    expect(setActiveTab).toHaveBeenCalledWith('build');
    expect(useBuilderStore.getState().activeFieldId).toBe('q1');
    expect(useBuilderStore.getState().activePageId).toBe('p2');
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    expect(result.current.showPublishModal).toBe(false);
    vi.unstubAllGlobals();
  });

  it('handleFixField without a field id only switches tab', () => {
    const { result, setActiveTab } = setup();
    act(() => result.current.handleFixField());
    expect(setActiveTab).toHaveBeenCalledWith('build');
    expect(useBuilderStore.getState().activeFieldId).toBeNull();
  });

  it('handleFixField with an unknown field leaves the active page alone', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0));
    const { result } = setup();
    act(() => result.current.handleFixField('ghost'));
    expect(useBuilderStore.getState().activePageId).toBe('p1');
    expect(useBuilderStore.getState().activeFieldId).toBe('ghost');
    vi.unstubAllGlobals();
  });
});
