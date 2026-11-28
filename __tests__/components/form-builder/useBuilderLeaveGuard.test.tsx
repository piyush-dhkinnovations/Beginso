import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { useBuilderStore } from '@/store/builderStore';
import { useBuilderLeaveGuard } from '@/components/form-builder/useBuilderLeaveGuard';

const onSave = vi.fn();
const hrefs = { formId: 'f1', overviewHref: '/forms/f1/overview', formsListHref: '/forms', onSave };

/** Click a link as a person would, and say whether the page would still follow it. */
function clickLink(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  Object.entries(attrs).forEach(([k, v]) => a.setAttribute(k, v));
  const label = document.createElement('span');
  a.appendChild(label);
  document.body.appendChild(a);
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  let followed = true;
  a.addEventListener('click', (e) => {
    followed = !e.defaultPrevented;
    e.preventDefault(); // jsdom cannot navigate
  });
  act(() => void label.dispatchEvent(event));
  a.remove();
  return followed;
}

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

  it('asks before any link to another page of the app, and leaves there if the person discards', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    expect(clickLink('/dashboard?x=1')).toBe(false);
    expect(result.current.showLeaveModal).toBe(true);
    act(() => result.current.handleLeaveWithoutSaving());
    expect(push).toHaveBeenCalledWith('/dashboard?x=1');
    expect(useBuilderStore.getState().dirty).toBe(false);
  });

  it.each([
    ['a new tab', '/terms', { target: '_blank' }],
    ['another site', 'https://example.com/x', {}],
    ['this form\u2019s preview', '/forms/f1/preview', {}],
    ['this same page', `${window.location.pathname}?tab=settings`, {}],
    ['a download', '/file.zip', { download: '' }],
  ])('lets %s through', (_name, href, attrs) => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    expect(clickLink(href, attrs as Record<string, string>)).toBe(true);
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('lets every link through while everything is saved', () => {
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    expect(clickLink('/dashboard')).toBe(true);
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('"Save and leave" saves, then goes', async () => {
    onSave.mockResolvedValue(true);
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => result.current.handleBack());
    await act(() => result.current.handleSaveAndLeave());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/forms/f1/overview');
  });

  it('"Save and leave" stays on the page when the save fails', async () => {
    onSave.mockResolvedValue(false);
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => result.current.handleBack());
    await act(() => result.current.handleSaveAndLeave());
    expect(push).not.toHaveBeenCalled();
    expect(result.current.showLeaveModal).toBe(false);
    expect(useBuilderStore.getState().dirty).toBe(true);
  });

  it('reads the latest dirty flag without being re-created', () => {
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => useBuilderStore.setState({ dirty: true }));
    act(() => result.current.handleBack());
    expect(result.current.showLeaveModal).toBe(true);
  });
});
