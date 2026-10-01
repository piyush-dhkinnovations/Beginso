/**
 * __tests__/components/responses/ResponsesStatCards.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.3 #2 — stats now read `ResponseStats.byCategory`
 * (task 1.7), not the removed `new`/`in_progress`/`completed` fields.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsesStatCards } from '@/components/responses/ResponsesStatCards';
import type { ResponseStats } from '@/types/response';

const STATS: ResponseStats = {
  total: 42,
  unread: 9,
  byStage: [],
  byCategory: { new: 10, in_progress: 5, completed: 27 },
};

describe('ResponsesStatCards', () => {
  it('renders 4 skeletons while loading', () => {
    const { container } = render(<ResponsesStatCards isLoading stats={undefined} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(4);
  });

  it('renders Total/Unread/New/Completed with their counts once loaded', () => {
    render(<ResponsesStatCards isLoading={false} stats={STATS} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
  });

  it('defaults every count to 0 when stats is undefined and not loading', () => {
    render(<ResponsesStatCards isLoading={false} stats={undefined} />);
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('renders a zero value with the muted zero-state token', () => {
    render(
      <ResponsesStatCards
        isLoading={false}
        stats={{ total: 0, unread: 0, byStage: [], byCategory: { new: 0, in_progress: 0, completed: 0 } }}
      />
    );
    const zero = screen.getAllByText('0')[0];
    expect(zero.className).toContain('text-(--text-muted)');
  });

  it('shows a retryable error instead of misleading zero totals', () => {
    const onRetry = vi.fn();
    render(<ResponsesStatCards isLoading={false} isError stats={undefined} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load response totals');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
