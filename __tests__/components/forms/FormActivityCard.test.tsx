/**
 * sprint-10-events-migration, tasks.md 3.2 — requirements.md §7.5, design.md §17.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormActivityCard } from '@/components/forms/FormActivityCard';
import type { WorkspaceEventItem } from '@/types/event';

function events(n: number): WorkspaceEventItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    actorName: `Actor ${i}`,
    action: 'form.published',
    targetType: 'form',
    targetId: 'f1',
    targetLabel: 'Survey',
    createdAt: new Date().toISOString(),
  }));
}

const base = { isLoading: false, isError: false, onRetry: vi.fn(), onViewAll: vi.fn() };

describe('FormActivityCard', () => {
  it('renders actor and action for each event, in a semantic list', () => {
    render(<FormActivityCard {...base} events={events(2)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Actor 0')).toBeInTheDocument();
    expect(screen.getAllByText(/published/).length).toBeGreaterThan(0);
  });

  it('shows the true zero-items empty state — distinct from the error state', () => {
    render(<FormActivityCard {...base} events={[]} />);

    expect(screen.getByText('Nothing has happened here yet.')).toBeInTheDocument();
    expect(screen.queryByText('Could not load activity.')).not.toBeInTheDocument();
  });

  it('shows the error state with a working Retry', async () => {
    const onRetry = vi.fn();
    render(<FormActivityCard {...base} events={undefined} isError onRetry={onRetry} />);

    expect(screen.getByText('Could not load activity.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a loading state instead of the empty state while fetching', () => {
    render(<FormActivityCard {...base} events={undefined} isLoading />);

    expect(screen.getByLabelText('Loading activity')).toBeInTheDocument();
    expect(screen.queryByText('Nothing has happened here yet.')).not.toBeInTheDocument();
  });

  it('caps the preview at 5 rows and offers View all only when more than 5 exist', async () => {
    const onViewAll = vi.fn();
    const { rerender } = render(<FormActivityCard {...base} events={events(5)} onViewAll={onViewAll} />);
    expect(screen.queryByRole('button', { name: 'View all' })).not.toBeInTheDocument();

    rerender(<FormActivityCard {...base} events={events(6)} onViewAll={onViewAll} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'View all' }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });
});
