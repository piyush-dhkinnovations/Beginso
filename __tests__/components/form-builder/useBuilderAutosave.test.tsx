import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { useBuilderAutosave, saveFormSnapshot } from '@/components/form-builder/useBuilderAutosave';
import type { Form } from '@/types/form';

const updateForm = formsService.updateForm as ReturnType<typeof vi.fn>;

const baseForm = (over: Partial<Form> = {}): Form =>
  ({
    _id: 'form-1',
    workspaceId: null,
    title: 'My form',
    description: '',
    status: 'draft',
    fields: [],
    pages: [{ id: 'p1', order: 0, title: 'My form' }],
    branding: {},
    settings: { honeypotEnabled: true },
    responseCount: 0,
    createdAt: '',
    updatedAt: '',
    ...over,
  }) as unknown as Form;

const store = () => useBuilderStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  updateForm.mockResolvedValue({});
  store().initForm(baseForm());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveFormSnapshot', () => {
  it('maps the snapshot onto the PATCH payload', async () => {
    await saveFormSnapshot('f9', { fields: [], formTitle: 'T', pages: [], branding: { primaryColor: '#000000' }, settings: { honeypotEnabled: false } } as never);
    expect(updateForm).toHaveBeenCalledWith('f9', { fields: [], title: 'T', pages: [], branding: { primaryColor: '#000000' }, settings: { honeypotEnabled: false } });
  });
});

describe('useBuilderAutosave - debounce', () => {
  it('stays idle and saves nothing while the form is clean', () => {
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(updateForm).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('idle');
    expect(result.current.savedAt).toBeNull();
  });

  it('saves 2s after an edit, marks the store clean and returns to idle after 2s more', async () => {
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Renamed'));
    expect(store().dirty).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(updateForm).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2);
    });
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(updateForm.mock.calls[0][0]).toBe('form-1');
    expect(updateForm.mock.calls[0][1]).toMatchObject({ title: 'Renamed' });
    expect(store().dirty).toBe(false);
    expect(result.current.saveState).toBe('saved');
    expect(result.current.savedAt).toBeInstanceOf(Date);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(result.current.saveState).toBe('idle');
  });

  it('restarts the debounce on each edit (one save for a burst)', async () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('A'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    act(() => store().setFormTitle('AB'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(updateForm).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(updateForm.mock.calls[0][1]).toMatchObject({ title: 'AB' });
  });

  it('goes to error and keeps the form dirty when the save fails', async () => {
    updateForm.mockRejectedValue(new Error('500'));
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('X'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(result.current.saveState).toBe('error');
    expect(store().dirty).toBe(true);
  });

  it('refuses to save while a choice field has no options', async () => {
    store().initForm(
      baseForm({ fields: [{ fieldId: 'q1', pageId: 'p1', type: 'dropdown', label: 'Pick', options: [], deleted: false } as never] }),
    );
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('X'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(updateForm).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('error');
  });

  it('does not save when there is no form id', async () => {
    useBuilderStore.setState({ formId: null, dirty: true });
    renderHook(() => useBuilderAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(updateForm).not.toHaveBeenCalled();
  });
});

describe('useBuilderAutosave - retry and flush', () => {
  it('handleRetrySave saves immediately and reports success', async () => {
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Retry'));
    await act(async () => {
      await result.current.handleRetrySave();
    });
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe('saved');
    expect(store().dirty).toBe(false);
  });

  it('handleRetrySave toasts when it fails again', async () => {
    updateForm.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Retry'));
    await act(async () => {
      await result.current.handleRetrySave();
    });
    expect(result.current.saveState).toBe('error');
    expect(toast).toHaveBeenCalledWith('Could not save. Please try again.', 'error');
  });

  it('flushes unsaved edits when the page is hidden', async () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Bye'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(updateForm.mock.calls[0][1]).toMatchObject({ title: 'Bye' });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('flushes on pagehide, but not when clean', async () => {
    renderHook(() => useBuilderAutosave());
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(updateForm).not.toHaveBeenCalled();
    act(() => store().setFormTitle('Bye'));
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(updateForm).toHaveBeenCalledTimes(1);
  });

  it('warns before unload only while dirty', () => {
    renderHook(() => useBuilderAutosave());
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    act(() => store().setFormTitle('Dirty'));
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('saves pending edits on unmount and removes its listeners', async () => {
    const { unmount } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Last'));
    unmount();
    // Saves go through one queue (so a user's own saves never conflict); the flush starts on the next microtask.
    await Promise.resolve();
    await Promise.resolve();
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(updateForm.mock.calls[0][1]).toMatchObject({ title: 'Last' });

    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});
