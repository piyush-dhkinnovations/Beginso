import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
const router = { push, replace };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { useBuilderStore } from '@/store/builderStore';
import { BACK_FALLBACK_MS, useBuilderLeaveGuard } from '@/components/form-builder/useBuilderLeaveGuard';
import { storeAutoSave } from '@/lib/builderPrefs';

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
  localStorage.clear();
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
    expect(replace).toHaveBeenCalledWith('/forms/f1/overview');
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
    expect(replace).toHaveBeenCalledWith('/forms');
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
    expect(replace).toHaveBeenCalledWith('/dashboard?x=1');
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
    expect(replace).toHaveBeenCalledWith('/forms/f1/overview');
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

describe('the browser\'s Back button', () => {
  let back: ReturnType<typeof vi.spyOn>;
  let forward: ReturnType<typeof vi.spyOn>;
  let pushState: ReturnType<typeof vi.spyOn>;
  const pop = () => act(() => void window.dispatchEvent(new PopStateEvent('popstate')));

  beforeEach(() => {
    back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    forward = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    pushState = vi.spyOn(window.history, 'pushState');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('doubles the builder\'s history entry once, only while there is something unsaved', () => {
    renderHook(() => useBuilderLeaveGuard(hrefs));
    expect(pushState).not.toHaveBeenCalled();
    act(() => useBuilderStore.setState({ dirty: true }));
    act(() => useBuilderStore.setState({ dirty: false }));
    act(() => useBuilderStore.setState({ dirty: true }));
    expect(pushState).toHaveBeenCalledTimes(1);
  });

  it('asks, stepping forward again so the person stays; Keep editing changes nothing', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    pop();
    expect(forward).toHaveBeenCalledTimes(1);
    expect(result.current.showLeaveModal).toBe(true);
    pop(); // the step forward arriving
    act(() => result.current.handleStay());
    expect(back).not.toHaveBeenCalled();
    // and it asks again the next time
    pop();
    expect(result.current.showLeaveModal).toBe(true);
  });

  it('Discard then goes back to where the person came from', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    pop();
    pop();
    act(() => result.current.handleLeaveWithoutSaving());
    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('goes to the overview when there is no earlier page to go back to', () => {
    vi.useFakeTimers();
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    pop();
    pop();
    act(() => result.current.handleLeaveWithoutSaving());
    act(() => void vi.advanceTimersByTime(BACK_FALLBACK_MS));
    expect(replace).toHaveBeenCalledWith('/forms/f1/overview');
  });

  it('leaves on one press once the changes have been saved', () => {
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    act(() => useBuilderStore.setState({ dirty: false }));
    pop();
    expect(result.current.showLeaveModal).toBe(false);
    expect(back).toHaveBeenCalledTimes(1);
    expect(forward).not.toHaveBeenCalled();
  });
});

describe('leaving with Auto save on', () => {
  beforeEach(() => storeAutoSave(true));
  afterEach(() => vi.restoreAllMocks());
  const savesAndCleans = () =>
    onSave.mockImplementation(async () => {
      useBuilderStore.setState({ dirty: false });
      return true;
    });

  it.each([
    ['the back arrow', (r: { handleBack: () => void }) => r.handleBack(), '/forms/f1/overview'],
    ['a menu link', () => clickLink('/dashboard'), '/dashboard'],
  ])('saves and goes by %s, without asking', async (_name, leaveBy, to) => {
    savesAndCleans();
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    await act(async () => void leaveBy(result.current));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(to);
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('saves and goes back on the browser\'s Back button', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    savesAndCleans();
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    await act(async () => void window.dispatchEvent(new PopStateEvent('popstate')));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
    expect(result.current.showLeaveModal).toBe(false);
  });

  it('asks only when the save does not go through, and stays until the person chooses', async () => {
    onSave.mockResolvedValue(false);
    useBuilderStore.setState({ dirty: true });
    const { result } = renderHook(() => useBuilderLeaveGuard(hrefs));
    await act(async () => result.current.handleBack());
    expect(result.current.showLeaveModal).toBe(true);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
