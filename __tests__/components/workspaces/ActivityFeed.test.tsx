/**
 * sprint-10-events-migration, tasks.md 4.1 — requirements.md §7.6, design.md §17.
 */
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('ActivityFeed actor avatars', () => {
  it("shows the actor's picture, decorative because their name is right beside it", () => {
    const { container } = render(<ActivityFeed events={[EVENT]} avatarOf={() => 'https://cdn.example.com/a/priya.png'} />);
    const img = container.querySelector('li img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/a/priya.png');
    expect(img).toHaveAttribute('alt', '');
    expect(screen.getAllByText('Priya Shah')).toHaveLength(1); // the name is not repeated for assistive technology
  });

  it('keeps the category icon on the picture', () => {
    const { container } = render(<ActivityFeed events={[EVENT]} avatarOf={() => 'https://cdn.example.com/a/priya.png'} />);
    expect(container.querySelector('li svg')).not.toBeNull();
  });

  it('shows initials when there is no picture, or it cannot be loaded', () => {
    const { container, rerender } = render(<ActivityFeed events={[EVENT]} avatarOf={() => undefined} />);
    expect(container.querySelector('li img')).toBeNull();
    expect(screen.getByText('PS')).toBeInTheDocument();
    rerender(<ActivityFeed events={[EVENT]} avatarOf={() => 'https://cdn.example.com/missing.png'} />);
    fireEvent.error(container.querySelector('li img')!);
    expect(container.querySelector('li img')).toBeNull();
    expect(screen.getByText('PS')).toBeInTheDocument();
  });

  it('works without a lookup, and gives each person their own picture', () => {
    const other = { ...EVENT, id: 'e2', actorName: 'Ben Das', action: 'form.published' };
    const { container, rerender } = render(<ActivityFeed events={[EVENT]} />);
    expect(container.querySelector('li img')).toBeNull();
    rerender(<ActivityFeed events={[EVENT, other]} avatarOf={(e) => (e.actorName === 'Ben Das' ? 'https://cdn.example.com/a/ben.png' : undefined)} />);
    const imgs = container.querySelectorAll('li img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', 'https://cdn.example.com/a/ben.png');
  });

  it('a repeated action by the same person is still one row with their one picture', () => {
    const { container } = render(
      <ActivityFeed events={[EVENT, { ...EVENT, id: 'e2' }, { ...EVENT, id: 'e3' }]} avatarOf={() => 'https://cdn.example.com/a/priya.png'} />
    );
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(container.querySelectorAll('li img')).toHaveLength(1);
    expect(screen.getByText('×3')).toBeInTheDocument();
  });
});
