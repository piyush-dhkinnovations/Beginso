/**
 * __tests__/components/responses/BulkActionBar.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.5 (5.1), design.md §15, task 2.4 rebuild:
 * role-gated actions (omitted, not disabled), "Select all N matching" sends a filter, a 200-id
 * bulk change is one call (one `onBulk`/one eventual request), Delete goes through
 * `onDeleteRequest` (the confirm modal is the caller's job) rather than deleting directly.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionBar } from '@/components/responses/BulkActionBar';
import type { StageRef } from '@/types/stage';
import type { MemberListItem } from '@/types/team';
import type { Tag } from '@/types/tag';

const STAGES: StageRef[] = [
  { id: 's-new', name: 'New', colour: 'info', category: 'new' },
  { id: 's-completed', name: 'Completed', colour: 'success', category: 'completed' },
];

const TAGS: Tag[] = [{ id: 't1', name: 'Hot lead', colour: 'success' }];

const MEMBERS: MemberListItem[] = [
  {
    membershipId: 'm1',
    userId: 'u1',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    role: 'admin',
    avatarUrl: null,
    isOwner: false,
    lastActiveAt: null,
  },
];

const baseProps = {
  selectedIds: ['r1', 'r2'],
  selectAllMatching: false,
  totalMatching: 2,
  onToggleSelectAllMatching: vi.fn(),
  filters: {},
  stages: STAGES,
  tags: TAGS,
  members: MEMBERS,
  role: 'owner' as const,
  isLoading: false,
  onBulk: vi.fn(),
  onDeleteRequest: vi.fn(),
  onExport: vi.fn(),
  onClear: vi.fn(),
};

describe('BulkActionBar', () => {
  it('renders null when nothing is selected', () => {
    const { container } = render(<BulkActionBar {...baseProps} selectedIds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the selected count in an aria-live region', () => {
    render(<BulkActionBar {...baseProps} />);
    const live = screen.getByText('2 selected');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });

  it('is a labelled region (requirements.md §11)', () => {
    render(<BulkActionBar {...baseProps} />);
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeInTheDocument();
  });

  it('fires onBulk with a {ids} target and a stage action', async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    render(<BulkActionBar {...baseProps} onBulk={onBulk} />);

    await user.selectOptions(screen.getByLabelText('Change stage for selected responses'), 's-completed');
    expect(onBulk).toHaveBeenCalledWith({ ids: ['r1', 'r2'] }, { type: 'stage', stageId: 's-completed' });
    expect(onBulk).toHaveBeenCalledTimes(1);
  });

  it('a 200-id selection is still one onBulk call, not one per id', async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    const many = Array.from({ length: 200 }, (_, i) => `r${i}`);
    render(<BulkActionBar {...baseProps} selectedIds={many} totalMatching={200} onBulk={onBulk} />);

    await user.selectOptions(screen.getByLabelText('Change stage for selected responses'), 's-completed');
    expect(onBulk).toHaveBeenCalledTimes(1);
    expect(onBulk).toHaveBeenCalledWith({ ids: many }, { type: 'stage', stageId: 's-completed' });
  });

  it('"Select all N matching" appears only when more responses match than are on the page, and toggles a filter target', async () => {
    const user = userEvent.setup();
    const onToggleSelectAllMatching = vi.fn();
    render(<BulkActionBar {...baseProps} totalMatching={50} onToggleSelectAllMatching={onToggleSelectAllMatching} />);

    const link = screen.getByRole('button', { name: /select all 50 matching/i });
    await user.click(link);
    expect(onToggleSelectAllMatching).toHaveBeenCalledWith(true);
  });

  it('once selectAllMatching is true, onBulk receives a {filter} target, never N ids', async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    render(
      <BulkActionBar
        {...baseProps}
        selectAllMatching
        totalMatching={500}
        filters={{ stageId: 's-new' }}
        formId="form-1"
        onBulk={onBulk}
      />
    );

    await user.selectOptions(screen.getByLabelText('Change stage for selected responses'), 's-completed');
    expect(onBulk).toHaveBeenCalledWith(
      { filter: { stageId: 's-new' }, formId: 'form-1' },
      { type: 'stage', stageId: 's-completed' }
    );
  });

  it('routes Delete through onDeleteRequest, not a direct delete', async () => {
    const user = userEvent.setup();
    const onDeleteRequest = vi.fn();
    render(<BulkActionBar {...baseProps} onDeleteRequest={onDeleteRequest} />);

    await user.click(screen.getByRole('button', { name: /more bulk actions/i }));
    await user.click(await screen.findByText('Delete'));
    expect(onDeleteRequest).toHaveBeenCalledWith({ ids: ['r1', 'r2'] }, 2);
  });

  it('omits Delete/Export for a role without responses:delete/responses:export (Reviewer)', async () => {
    const user = userEvent.setup();
    render(<BulkActionBar {...baseProps} role="viewer" />);
    await user.click(screen.getByRole('button', { name: /more bulk actions/i }));
    const menu = screen.getByRole('menu');
    expect(within(menu).queryByText('Delete')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Export')).not.toBeInTheDocument();
  });

  it('omits every act-gated control entirely for an undefined role, rather than disabling them', () => {
    render(<BulkActionBar {...baseProps} role={undefined} />);
    expect(screen.queryByLabelText('Change stage for selected responses')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assign selected responses')).not.toBeInTheDocument();
  });

  it('omits the stage picker when no stages are available yet, without crashing', () => {
    render(<BulkActionBar {...baseProps} stages={[]} />);
    expect(screen.queryByLabelText('Change stage for selected responses')).not.toBeInTheDocument();
  });

  it('fires onClear', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<BulkActionBar {...baseProps} onClear={onClear} />);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
