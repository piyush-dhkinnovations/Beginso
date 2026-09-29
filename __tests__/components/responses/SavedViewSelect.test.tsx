/**
 * __tests__/components/responses/SavedViewSelect.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.6 (6.1), task 2.6.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedViewSelect } from '@/components/responses/SavedViewSelect';
import type { SavedView } from '@/types/savedView';
import type { StageRef } from '@/types/stage';

const STAGES: StageRef[] = [{ id: 's1', name: 'New', colour: 'info', category: 'new' }];

const MY_VIEW: SavedView = {
  id: 'v1', name: 'My shortlist', ownerId: 'u1', ownerName: 'Priya', visibility: 'personal',
  formId: null, filters: {}, viewMode: 'table', createdAt: '2026-09-29T00:00:00.000Z',
};
const TEAM_VIEW: SavedView = {
  id: 'v2', name: 'Needs screening', ownerId: 'u2', ownerName: 'Arjun', visibility: 'team',
  formId: null, filters: { stageId: 'deleted-stage' }, viewMode: 'table', createdAt: '2026-09-29T00:00:00.000Z',
};

const baseProps = {
  views: [MY_VIEW, TEAM_VIEW],
  currentUserId: 'u1',
  stages: STAGES,
  tags: [],
  members: [],
  role: 'owner' as const,
  onApply: vi.fn(),
  onClearApplied: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
};

describe('SavedViewSelect', () => {
  it('groups My views and Team views separately', () => {
    render(<SavedViewSelect {...baseProps} />);
    const select = screen.getByLabelText('Saved views') as HTMLSelectElement;
    const groups = Array.from(select.querySelectorAll('optgroup')).map((g) => g.label);
    expect(groups).toEqual(['My views', 'Team views']);
  });

  it('applying a view fires onApply with that view', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<SavedViewSelect {...baseProps} onApply={onApply} />);
    await user.selectOptions(screen.getByLabelText('Saved views'), 'v1');
    expect(onApply).toHaveBeenCalledWith(MY_VIEW);
  });

  it('shows the stale-filter notice for a view referencing a deleted stage', () => {
    render(<SavedViewSelect {...baseProps} activeViewId="v2" />);
    expect(screen.getByRole('alert')).toHaveTextContent('1 filter no longer exists.');
  });

  it('shows no notice for a view whose filters all still resolve', () => {
    render(<SavedViewSelect {...baseProps} activeViewId="v1" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers manage (rename/delete) for the view owner', async () => {
    const user = userEvent.setup();
    render(<SavedViewSelect {...baseProps} activeViewId="v1" />);
    await user.click(screen.getByRole('button', { name: /manage the "my shortlist" saved view/i }));
    expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('omits manage for a team view when the caller is neither owner nor Admin+', async () => {
    const user = userEvent.setup();
    render(<SavedViewSelect {...baseProps} activeViewId="v2" role="editor" />);
    await user.click(screen.getByRole('button', { name: /manage the "needs screening" saved view/i }));
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('an Admin can manage a team view they do not own', async () => {
    const user = userEvent.setup();
    render(<SavedViewSelect {...baseProps} activeViewId="v2" role="admin" />);
    await user.click(screen.getByRole('button', { name: /manage the "needs screening" saved view/i }));
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
  });

  it('delete fires onDelete with the view', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<SavedViewSelect {...baseProps} activeViewId="v1" onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: /manage the "my shortlist" saved view/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(MY_VIEW);
  });
});
