/**
 * __tests__/components/team/MemberTable.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.2, §11, design.md §21.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberTable } from '@/components/team/MemberTable';
import type { MemberListItem } from '@/types/team';

const OWNER: MemberListItem = {
  membershipId: 'm-owner',
  userId: 'u-owner',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  avatarUrl: null,
  role: 'owner',
  isOwner: true,
  lastActiveAt: null,
};

const ADMIN: MemberListItem = {
  membershipId: 'm-admin',
  userId: 'u-admin',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  avatarUrl: null,
  role: 'admin',
  isOwner: false,
  lastActiveAt: '2026-09-10T00:00:00.000Z',
};

const VIEWER: MemberListItem = {
  membershipId: 'm-viewer',
  userId: 'u-viewer',
  name: 'Chidi Okafor',
  email: 'chidi@example.com',
  avatarUrl: null,
  role: 'viewer',
  isOwner: false,
  lastActiveAt: null,
};

function noop() {}

describe('MemberTable', () => {
  it("never shows a Select or remove action on the Owner's row, even when the caller can manage", () => {
    render(
      <MemberTable
        members={[OWNER, ADMIN]}
        currentUserId="someone-else"
        canManage
        onRoleChange={noop}
        onRemove={noop}
      />
    );
    expect(screen.queryByLabelText('Change role for Alex Rivera')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Alex Rivera')).not.toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it("never shows a remove action on the caller's own row", () => {
    render(
      <MemberTable members={[ADMIN]} currentUserId="u-admin" canManage onRoleChange={noop} onRemove={noop} />
    );
    expect(screen.queryByLabelText('Remove Priya Sharma')).not.toBeInTheDocument();
  });

  it('a non-manager caller sees a fully read-only table — no Select, no remove action on anyone', () => {
    render(
      <MemberTable
        members={[OWNER, ADMIN, VIEWER]}
        currentUserId="someone-else"
        canManage={false}
        onRoleChange={noop}
        onRemove={noop}
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Remove /)).not.toBeInTheDocument();
    // Roles still render, as read-only badges
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
  });

  it("changing a non-owner member's role fires onRoleChange with the right payload", async () => {
    const onRoleChange = vi.fn();
    render(
      <MemberTable
        members={[ADMIN]}
        currentUserId="someone-else"
        canManage
        onRoleChange={onRoleChange}
        onRemove={noop}
      />
    );
    const select = screen.getByLabelText('Change role for Priya Sharma');
    await userEvent.selectOptions(select, 'Reviewer');
    expect(onRoleChange).toHaveBeenCalledWith(ADMIN, 'viewer');
  });

  it('remove opens a focus-trapped confirmation modal naming the member, not window.confirm()', async () => {
    const onRemove = vi.fn();
    render(
      <MemberTable
        members={[ADMIN]}
        currentUserId="someone-else"
        canManage
        onRoleChange={noop}
        onRemove={onRemove}
      />
    );
    await userEvent.click(screen.getByLabelText('Remove Priya Sharma'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Priya Sharma will lose access/)).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledWith(ADMIN);
  });

  it('canceling the remove confirmation does not call onRemove', async () => {
    const onRemove = vi.fn();
    render(
      <MemberTable
        members={[ADMIN]}
        currentUserId="someone-else"
        canManage
        onRoleChange={noop}
        onRemove={onRemove}
      />
    );
    await userEvent.click(screen.getByLabelText('Remove Priya Sharma'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
