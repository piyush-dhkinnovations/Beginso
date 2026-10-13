import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBuilderUndoShortcuts } from '@/components/form-builder/useBuilderUndoShortcuts';
import { useBuilderStore } from '@/store/builderStore';

const undo = vi.fn();
const redo = vi.fn();

function press(init: KeyboardEventInit, target: EventTarget = document.body) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
  useBuilderStore.setState({ undo, redo });
});

describe('useBuilderUndoShortcuts', () => {
  it('ignores a key event aimed at window or document instead of throwing', () => {
    renderHook(() => useBuilderUndoShortcuts());
    expect(() => press({ key: 'z', ctrlKey: true }, window)).not.toThrow();
    expect(() => press({ key: 'z', ctrlKey: true }, document)).not.toThrow();
    // no element to be "typing in", so it is still treated as the page-level shortcut
    expect(undo).toHaveBeenCalledTimes(2);
  });

  it('Ctrl+Z undoes and prevents the default', () => {
    renderHook(() => useBuilderUndoShortcuts());
    const e = press({ key: 'z', ctrlKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(true);
  });

  it('Cmd+Z works too, case-insensitively', () => {
    renderHook(() => useBuilderUndoShortcuts());
    press({ key: 'Z', metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+Z and Ctrl+Y redo', () => {
    renderHook(() => useBuilderUndoShortcuts());
    press({ key: 'z', ctrlKey: true, shiftKey: true });
    press({ key: 'y', ctrlKey: true });
    expect(redo).toHaveBeenCalledTimes(2);
    expect(undo).not.toHaveBeenCalled();
  });

  it('ignores keys without Ctrl/Cmd, with Alt, and other letters', () => {
    renderHook(() => useBuilderUndoShortcuts());
    press({ key: 'z' });
    press({ key: 'z', ctrlKey: true, altKey: true });
    const other = press({ key: 'a', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
    expect(other.defaultPrevented).toBe(false);
  });

  it.each(['input', 'textarea', 'select'])('leaves browser text undo alone inside a <%s>', (tag) => {
    renderHook(() => useBuilderUndoShortcuts());
    const el = document.createElement(tag);
    document.body.appendChild(el);
    const e = press({ key: 'z', ctrlKey: true }, el);
    expect(undo).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    el.remove();
  });

  it('leaves contenteditable elements alone (and their children)', () => {
    renderHook(() => useBuilderUndoShortcuts());
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    host.appendChild(child);
    document.body.appendChild(host);
    press({ key: 'z', ctrlKey: true }, child);
    expect(undo).not.toHaveBeenCalled();
    host.remove();
  });

  it('stops listening after unmount', () => {
    const { unmount } = renderHook(() => useBuilderUndoShortcuts());
    unmount();
    press({ key: 'z', ctrlKey: true });
    expect(undo).not.toHaveBeenCalled();
  });
});
