import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { useBuilderStore } from '@/store/builderStore';
import { useBuilderLeaveGuard } from '@/components/form-builder/useBuilderLeaveGuard';

const hrefs = { overviewHref: '/forms/f1/overview', formsListHref: '/forms' };

beforeEach(() => {
  vi.clearAllMocks();
  useBuilderStore.setState({ dirty: false, pendingLeaveUrl: null });
});

describe('useBuilderLeaveGuard', () => {
  it('back navigates straight to the overview when clean', () => {
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => result.current.handleBack());
    expect(push).toHaveBeenCalledWith('/forms/f1/overview');
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('back opens the modal instead when there are unsaved changes, and leaving goes to the overview', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => result.current.handleBack());
    expect(push).not.toHaveBeenCalled();
    expect(result.current.showLeaveModal).toBe(true);

    act(() => result.current.handleLeaveWithoutSaving());
    expect(push).toHaveBeenCalledWith('/forms/f1/overview');
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('stay closes the modal without navigating', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => result.current.handleBack());
    act(() => result.current.handleStay());
    expect(result.current.showLeaveModal).toBe(false);
    expect(push).not.toHaveBeenCalled();
    // after staying, leaving falls back to the forms list
    act(() => result.current.handleLeaveWithoutSaving());
    expect(push).toHaveBeenCalledWith('/forms');
  });

  it('picks up a link click intercepted by the sidebar, then leaves to that url', () => {
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    expect(result.current.showLeaveModal).toBe(false);
    act(() => useBuilderStore.getState().setPendingLeaveUrl('/responses'));
    expect(result.current.showLeaveModal).toBe(true);
    expect(useBuilderStore.getState().pendingLeaveUrl).toBeNull();

    act(() => result.current.handleLeaveWithoutSaving());
    expect(push).toHaveBeenCalledWith('/responses');
  });

  it('reads the latest dirty flag without being re-created', () => {
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => useBuilderStore.setState({ dirty: true }));
    act(() => result.current.handleBack());
    expect(result.current.showLeaveModal).toBe(true);
  });
});
