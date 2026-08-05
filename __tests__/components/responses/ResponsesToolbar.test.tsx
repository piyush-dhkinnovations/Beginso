/**
 * __tests__/components/responses/ResponsesToolbar.test.tsx
 * Feature: sprint-4-responses
 * Tests: ResponsesToolbar — debounced search, clear button, status select, count label
 * Requirements: 3.1-3.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesToolbar } from '@/components/responses/ResponsesToolbar';

const baseProps = {
  search: '',
  status: 'all' as const,
  total: 3,
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
};

describe('ResponsesToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onSearchChange 300ms after typing stops', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearchChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onSearchChange={onSearchChange} />);

    await user.type(screen.getByPlaceholderText('Search responses…'), 'priya');
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchChange).toHaveBeenCalledWith('priya');
  });

  it('shows a clear button when the input is non-empty and resets on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearchChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onSearchChange={onSearchChange} />);

    await user.type(screen.getByPlaceholderText('Search responses…'), 'x');
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    await user.click(clearButton);

    expect(screen.getByPlaceholderText('Search responses…')).toHaveValue('');
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('fires onStatusChange when the status select changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onStatusChange = vi.fn();
    render(<ResponsesToolbar {...baseProps} onStatusChange={onStatusChange} />);

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'completed');
    expect(onStatusChange).toHaveBeenCalledWith('completed');
  });

  it('renders the count label in singular and plural form', () => {
    const { rerender } = render(<ResponsesToolbar {...baseProps} total={1} />);
    expect(screen.getByText('1 response')).toBeInTheDocument();

    rerender(<ResponsesToolbar {...baseProps} total={5} />);
    expect(screen.getByText('5 responses')).toBeInTheDocument();
  });
});
