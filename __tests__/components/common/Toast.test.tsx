/**
 * __tests__/Toast.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: Toast component — renders all 4 types, auto-dismisses after 4s
 * Requirements: 3.5
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '@/components/common/Toast';

/** Helper component that triggers a toast on button click */
function ToastTrigger({ type }: { type: 'success' | 'error' | 'warning' | 'info' }) {
  const { toast } = useToast();
  return (
    <button onClick={() => toast(`Test ${type} message`, type)}>
      Show {type}
    </button>
  );
}

function renderWithProvider(type: 'success' | 'error' | 'warning' | 'info') {
  return render(
    <ToastProvider>
      <ToastTrigger type={type} />
    </ToastProvider>
  );
}

afterEach(() => {
  // Ensure fake timers are always cleaned up
  vi.useRealTimers();
});

describe('Toast component', () => {
  it('renders a success toast with the correct message', async () => {
    const user = userEvent.setup();
    renderWithProvider('success');
    await user.click(screen.getByRole('button', { name: /show success/i }));
    expect(screen.getByText(/test success message/i)).toBeInTheDocument();
  });

  it('renders an error toast with the correct message', async () => {
    const user = userEvent.setup();
    renderWithProvider('error');
    await user.click(screen.getByRole('button', { name: /show error/i }));
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  });

  it('renders a warning toast with the correct message', async () => {
    const user = userEvent.setup();
    renderWithProvider('warning');
    await user.click(screen.getByRole('button', { name: /show warning/i }));
    expect(screen.getByText(/test warning message/i)).toBeInTheDocument();
  });

  it('renders an info toast with the correct message', async () => {
    const user = userEvent.setup();
    renderWithProvider('info');
    await user.click(screen.getByRole('button', { name: /show info/i }));
    expect(screen.getByText(/test info message/i)).toBeInTheDocument();
  });

  it('auto-dismisses after 4 seconds (fake timers)', () => {
    vi.useFakeTimers();

    const { getByRole, queryByText } = render(
      <ToastProvider>
        <ToastTrigger type="success" />
      </ToastProvider>
    );

    // Trigger the toast — synchronous since we use fake timers
    act(() => {
      getByRole('button', { name: /show success/i }).click();
    });

    // Toast is visible
    expect(queryByText(/test success message/i)).toBeInTheDocument();

    // Run all pending timers (including the 4000ms auto-dismiss)
    act(() => {
      vi.runAllTimers();
    });

    // Toast should be removed
    expect(queryByText(/test success message/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  }, 15000);


  it('can be manually dismissed with the close button', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger type="error" />
      </ToastProvider>
    );
    await user.click(screen.getByRole('button', { name: /show error/i }));
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();

    // Click the close (×) button — it has sr-only text "Close"
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);

    // Toast should now be removed
    expect(screen.queryByText(/test error message/i)).not.toBeInTheDocument();
  }, 10000);

  it('stacks multiple toasts', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger type="success" />
        <ToastTrigger type="error" />
      </ToastProvider>
    );
    await user.click(screen.getByRole('button', { name: /show success/i }));
    await user.click(screen.getByRole('button', { name: /show error/i }));
    expect(screen.getByText(/test success message/i)).toBeInTheDocument();
    expect(screen.getByText(/test error message/i)).toBeInTheDocument();
  }, 10000);
});

// Sprint 12 (inbox-collaboration), task 2.1: the optional action slot. Existing 3-arg callers
// above are untouched by this addition.
describe('Toast action slot', () => {
  function UndoTrigger({ onUndo }: { onUndo: () => void }) {
    const { toast } = useToast();
    return (
      <button onClick={() => toast('3 responses updated.', 'success', undefined, { label: 'Undo', onClick: onUndo })}>
        Trigger undo toast
      </button>
    );
  }

  it('renders the action button, keyboard-reachable, and invokes onClick', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <UndoTrigger onUndo={onUndo} />
      </ToastProvider>
    );
    await user.click(screen.getByRole('button', { name: /trigger undo toast/i }));
    const undoButton = screen.getByRole('button', { name: 'Undo' });
    undoButton.focus();
    expect(undoButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('defaults to at least an 8s duration when an action is present', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    const { getByRole, queryByText } = render(
      <ToastProvider>
        <UndoTrigger onUndo={onUndo} />
      </ToastProvider>
    );
    act(() => {
      getByRole('button', { name: /trigger undo toast/i }).click();
    });
    expect(queryByText(/3 responses updated/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(queryByText(/3 responses updated/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(queryByText(/3 responses updated/i)).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('keeps role="status" on the toast region with an action present', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <UndoTrigger onUndo={() => {}} />
      </ToastProvider>
    );
    await user.click(screen.getByRole('button', { name: /trigger undo toast/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
