import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { setPendingEdit, hasPendingEdits, flushPendingEdits, usePendingEdits, resetPendingEdits } from '@/lib/pendingEdits';

beforeEach(() => resetPendingEdits());

describe('pending edits', () => {
  it('tracks an uncommitted edit until it is cleared', () => {
    expect(hasPendingEdits()).toBe(false);
    setPendingEdit('a', { flush: () => undefined });
    expect(hasPendingEdits()).toBe(true);
    setPendingEdit('a', null);
    expect(hasPendingEdits()).toBe(false);
  });

  it('flushPendingEdits runs every registered commit', () => {
    const a = vi.fn();
    const b = vi.fn();
    setPendingEdit('a', { flush: a });
    setPendingEdit('b', { flush: b });
    flushPendingEdits();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a commit that clears its own entry while flushing does not break the others', () => {
    const b = vi.fn();
    setPendingEdit('a', { flush: () => setPendingEdit('a', null) });
    setPendingEdit('b', { flush: b });
    flushPendingEdits();
    expect(b).toHaveBeenCalledTimes(1);
    expect(hasPendingEdits()).toBe(true); // b is still registered until it clears itself
  });

  it('usePendingEdits re-renders when the first edit appears and when the last one goes', () => {
    const { result } = renderHook(() => usePendingEdits());
    expect(result.current).toBe(false);
    act(() => setPendingEdit('a', { flush: () => undefined }));
    expect(result.current).toBe(true);
    act(() => setPendingEdit('a', null));
    expect(result.current).toBe(false);
  });
});
