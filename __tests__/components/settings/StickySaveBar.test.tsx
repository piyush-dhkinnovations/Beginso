import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StickySaveBar, useSavedFlash } from '@/components/settings/StickySaveBar';

const bar = (over: Partial<React.ComponentProps<typeof StickySaveBar>> = {}) => (
  <form onSubmit={(e) => e.preventDefault()}>
    <StickySaveBar dirty saving={false} saved={false} onDiscard={vi.fn()} subject="Workspace settings" {...over} />
  </form>
);

describe('StickySaveBar', () => {
  it('renders nothing when clean and not just saved', () => {
    const { container } = render(bar({ dirty: false }));
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('when dirty offers Discard and Save changes', async () => {
    const onDiscard = vi.fn();
    render(bar({ onDiscard }));
    expect(screen.getByRole('region', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute('type', 'submit');
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('Save changes submits the surrounding form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <StickySaveBar dirty saving={false} saved={false} onDiscard={vi.fn()} subject="x" />
      </form>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('while saving disables both buttons', () => {
    render(bar({ saving: true }));
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('after a save shows the confirmation with the subject', () => {
    render(bar({ dirty: false, saved: true }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved. Workspace settings is up to date.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('dirty wins over saved', () => {
    render(bar({ dirty: true, saved: true }));
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('useSavedFlash', () => {
  afterEach(() => vi.useRealTimers());

  it('turns on for the given time then off', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSavedFlash(1000));
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => void vi.advanceTimersByTime(999));
    expect(result.current[0]).toBe(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current[0]).toBe(false);
  });

  it('restarts the timer when flashed again', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSavedFlash(1000));
    act(() => result.current[1]());
    act(() => void vi.advanceTimersByTime(800));
    act(() => result.current[1]());
    act(() => void vi.advanceTimersByTime(800));
    expect(result.current[0]).toBe(true);
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current[0]).toBe(false);
  });

  it('defaults to three seconds and keeps a stable flash function', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useSavedFlash());
    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);
    act(() => first());
    act(() => void vi.advanceTimersByTime(2999));
    expect(result.current[0]).toBe(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current[0]).toBe(false);
  });
});
