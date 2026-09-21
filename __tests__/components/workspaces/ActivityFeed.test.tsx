/**
 * sprint-10-events-migration, tasks.md 4.1 — requirements.md §7.6, design.md §17.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from '@/components/workspaces/ActivityFeed';
import type { WorkspaceEventItem } from '@/types/event';

const EVENT: WorkspaceEventItem = {
  id: 'e1',
  actorName: 'Priya Shah',
  action: 'access.granted',
  targetType: 'form',
  targetId: 'f1',
  targetLabel: 'Customer Survey',
  createdAt: new Date().toISOString(),
};

describe('ActivityFeed', () => {
  it('renders one list item per event with actor, verb and the snapshotted target label', () => {
    render(<ActivityFeed events={[EVENT, { ...EVENT, id: 'e2', action: 'form.published' }]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByText('Priya Shah', { selector: 'strong' })).toHaveLength(2);
    expect(screen.getAllByText('Customer Survey')).toHaveLength(2);
    expect(screen.getByText(/granted access to/)).toBeInTheDocument();
  });

  it('falls back to readable text for an action the frontend does not know', () => {
    render(<ActivityFeed events={[{ ...EVENT, action: 'form.archived' }]} />);

    expect(screen.getByText(/form archived/)).toBeInTheDocument();
  });

  it('shows the empty state for zero events', () => {
    render(<ActivityFeed events={[]} />);

    expect(screen.getByText('Nothing has happened yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
