import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInboxSelection } from '@/components/responses/useInboxSelection';

describe('useInboxSelection', () => {
  it('starts with nothing selected or pending', () => {
    const { result } = renderHook(() => useInboxSelection());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectAllMatching).toBe(false);
    expect(result.current.confirmDelete).toBeNull();
  });

  it('holds selected ids and select-all-matching, and clearSelection resets both', () => {
    const { result } = renderHook(() => useInboxSelection());
    act(() => {
      result.current.setSelectedIds(new Set(['a', 'b']));
      result.current.setSelectAllMatching(true);
    });
    expect([...result.current.selectedIds]).toEqual(['a', 'b']);
    expect(result.current.selectAllMatching).toBe(true);

    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.selectAllMatching).toBe(false);
  });

  it('clearSelection leaves a pending delete confirmation alone', () => {
    const { result } = renderHook(() => useInboxSelection());
    const pending = { mode: 'bulk' as const, target: { ids: ['a'] }, count: 1 };
    act(() => result.current.setConfirmDelete(pending));
    act(() => result.current.clearSelection());
    expect(result.current.confirmDelete).toEqual(pending);
    act(() => result.current.setConfirmDelete(null));
    expect(result.current.confirmDelete).toBeNull();
  });
});
