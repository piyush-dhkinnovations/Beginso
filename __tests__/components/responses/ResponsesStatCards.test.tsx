/**
 * __tests__/components/responses/ResponsesStatCards.test.tsx
 * Feature: responses-drawer-redesign
 * Tests: ResponsesStatCards — loading skeletons, rendered counts, zero-value styling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsesStatCards } from '@/components/responses/ResponsesStatCards';

describe('ResponsesStatCards', () => {
  it('renders 4 skeletons while loading', () => {
    const { container } = render(<ResponsesStatCards isLoading stats={undefined} />);
    expect(container.querySelectorAll('.animate-pulse').length).toBe(4);
  });

  it('renders the 4 labels and their counts once loaded', () => {
    render(<ResponsesStatCards isLoading={false} stats={{ total: 42, new: 10, in_progress: 5, completed: 27 }} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
  });

  it('defaults every count to 0 when stats is undefined and not loading', () => {
    render(<ResponsesStatCards isLoading={false} stats={undefined} />);
    expect(screen.getAllByText('0')).toHaveLength(4);
  });

  it('renders a zero value with the muted zero-state color', () => {
    render(<ResponsesStatCards isLoading={false} stats={{ total: 0, new: 0, in_progress: 0, completed: 0 }} />);
    const zero = screen.getAllByText('0')[0];
    expect(zero.className).toContain('text-neutral-400');
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
