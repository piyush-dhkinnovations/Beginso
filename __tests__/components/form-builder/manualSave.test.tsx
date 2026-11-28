/**
 * Saving the builder by hand, which is the default: nothing is sent until Save, Ctrl/Cmd+S or an action that needs it.
 * With the Auto save setting turned on it saves by itself again (useBuilderAutosave.test.tsx covers that side).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, screen, act, fireEvent } from '@testing-library/react';

vi.mock('@/services/forms', () => ({ formsService: { updateForm: vi.fn() } }));
const toast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { formsService } from '@/services/forms';
import { useBuilderStore } from '@/store/builderStore';
import { expectPreview, useBuilderAutosave } from '@/components/form-builder/useBuilderAutosave';
import { BuilderTabs } from '@/components/form-builder/BuilderTabs';
import { LeaveBuilderModal } from '@/components/form-builder/LeaveBuilderModal';
import { BuilderSettingsTab } from '@/components/settings/BuilderSettingsTab';
import { readAutoSave, storeAutoSave } from '@/lib/builderPrefs';
import { resetPendingEdits, setPendingEdit } from '@/lib/pendingEdits';
import type { Form } from '@/types/form';

const updateForm = vi.mocked(formsService.updateForm);
const store = () => useBuilderStore.getState();
const form = (over: Partial<Form> = {}) =>
  ({ _id: 'form-1', workspaceId: null, title: 'My form', status: 'draft', fields: [], pages: [{ id: 'p1', order: 0, title: 'P' }], branding: {}, settings: {}, ...over }) as unknown as Form;
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const pressSave = (extra: Partial<KeyboardEventInit> = {}) => {
  const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true, ...extra });
  act(() => void window.dispatchEvent(event));
  return event;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  localStorage.clear();
  resetPendingEdits();
  updateForm.mockResolvedValue({} as never);
  store().initForm(form());
});
afterEach(() => vi.useRealTimers());

describe('manual save (the default)', () => {
  it('is the default', () => {
    expect(readAutoSave()).toBe(false);
  });

  it('sends nothing by itself: not after waiting, not when the tab is hidden or closed', async () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Typed'));
    await wait(60_000);
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(updateForm).not.toHaveBeenCalled();
    expect(store().dirty).toBe(true);
  });

  it('still asks before the tab is closed with unsaved changes', () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Typed'));
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('saveNow sends the form once, with text typed a moment ago, and marks it saved', async () => {
    const { result } = renderHook(() => useBuilderAutosave());
    setPendingEdit('label', { flush: () => (setPendingEdit('label', null), store().setFormTitle('Just typed')) });
    await act(async () => expect(await result.current.saveNow()).toBe(true));
    expect(updateForm).toHaveBeenCalledTimes(1);
    expect(updateForm.mock.calls[0][1]).toMatchObject({ title: 'Just typed' });
    expect(store().dirty).toBe(false);
  });

  it('saveNow sends nothing when everything is saved', async () => {
    const { result } = renderHook(() => useBuilderAutosave());
    await act(async () => expect(await result.current.saveNow()).toBe(true));
    expect(updateForm).not.toHaveBeenCalled();
  });

  it('Ctrl+S and ⌘S save instead of the browser’s "save page"', async () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('A'));
    expect(pressSave().defaultPrevented).toBe(true);
    await wait(10);
    expect(updateForm).toHaveBeenCalledTimes(1);
    act(() => store().setFormTitle('B'));
    expect(pressSave({ ctrlKey: false, metaKey: true }).defaultPrevented).toBe(true);
    await wait(10);
    expect(updateForm).toHaveBeenCalledTimes(2);
  });

  it('a change made while the save is on its way stays unsaved', async () => {
    let answer: (value: unknown) => void = () => {};
    updateForm.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)) as never);
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('First'));
    let done: Promise<boolean>;
    await act(async () => {
      done = result.current.saveNow();
      await vi.advanceTimersByTimeAsync(1);
    });
    act(() => store().setFormTitle('Second'));
    await act(async () => {
      answer({});
      await done;
    });
    expect(store().dirty).toBe(true);
    expect(store().formTitle).toBe('Second');
  });

  it('says why it cannot save a choice question with no options', async () => {
    store().initForm(form({ fields: [{ fieldId: 'q', pageId: 'p1', type: 'dropdown', label: 'Pick', options: [], deleted: false }] as never }));
    const { result } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('X'));
    await act(async () => expect(await result.current.saveNow()).toBe(false));
    expect(updateForm).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Could not save: Add at least one option to every choice question', 'error');
  });

  it('leaving the builder inside the app sends nothing, and says the changes are kept', async () => {
    const { unmount } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Unsaved'));
    unmount();
    await wait(10);
    expect(updateForm).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('kept in this browser'), 'warning');
  });

  it('leaving for the preview says nothing', async () => {
    const { unmount } = renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Unsaved'));
    expectPreview();
    unmount();
    await wait(10);
    expect(toast).not.toHaveBeenCalled();
  });

  it('turning Auto save on saves what is unsaved a few seconds later', async () => {
    renderHook(() => useBuilderAutosave());
    act(() => store().setFormTitle('Waiting'));
    await wait(10_000);
    act(() => storeAutoSave(true));
    await wait(5100);
    expect(updateForm).toHaveBeenCalledTimes(1);
  });
});

describe('the Save button before Undo', () => {
  const tabs = (props: Partial<React.ComponentProps<typeof BuilderTabs>>) => (
    <BuilderTabs activeTab="build" onChange={() => {}} canUndo canRedo={false} onUndo={() => {}} onRedo={() => {}} onSave={() => {}} {...props} />
  );

  it('comes before Undo and saves when there is something to save', () => {
    const onSave = vi.fn();
    render(tabs({ unsaved: true, onSave }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save.compareDocumentPosition(screen.getByRole('button', { name: 'Undo' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalled();
  });

  it('reads Saved and does nothing when everything is saved, or when the form must be reloaded first', () => {
    const { rerender } = render(tabs({ unsaved: false }));
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
    rerender(tabs({ unsaved: true, saveBlocked: true }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('the warning before leaving', () => {
  it('offers to save and leave, to discard, or to keep editing', () => {
    const [onSave, onDiscard, onStay] = [vi.fn(), vi.fn(), vi.fn()];
    render(<LeaveBuilderModal isOpen formTitle="Survey" onSave={onSave} onDiscard={onDiscard} onStay={onStay} />);
    expect(screen.getByText(/Your changes to "Survey" are not saved yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect([onSave, onDiscard, onStay].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });
});

describe('Account settings → Form builder', () => {
  it('has Auto save off at first, explains manual saving, and remembers the switch on this device', () => {
    const { unmount } = render(<BuilderSettingsTab />);
    const toggle = screen.getByRole('switch', { name: 'Auto save' });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/press Ctrl \+ S/)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(readAutoSave()).toBe(true);
    expect(screen.queryByText(/press Ctrl \+ S/)).not.toBeInTheDocument();

    unmount();
    render(<BuilderSettingsTab />);
    expect(screen.getByRole('switch', { name: 'Auto save' })).toBeChecked();
  });
});
