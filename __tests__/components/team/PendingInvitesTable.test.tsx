/**
 * __tests__/components/team/PendingInvitesTable.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.3, design.md §21.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingInvitesTable } from '@/components/team/PendingInvitesTable';
import type { PendingInvitation } from '@/types/team';

const INVITE: PendingInvitation = {
  id: 'inv-1',
  email: 'colleague@example.com',
  role: 'member',
  status: 'pending',
  expiresAt: '2026-09-18T12:00:00.000Z',
  createdAt: '2026-09-11T12:00:00.000Z',
};

function noop() {}

describe('PendingInvitesTable', () => {
  it('shows Resend and Revoke for a manager', () => {
    render(<PendingInvitesTable invitations={[INVITE]} canManage onResend={noop} onRevoke={noop} />);
    expect(screen.getByLabelText('Resend invite to colleague@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Revoke invite to colleague@example.com')).toBeInTheDocument();
  });

  it('shows a heading and an empty state when there are no pending invitations', () => {
    const onInvite = vi.fn();
    render(<PendingInvitesTable invitations={[]} canManage onResend={noop} onRevoke={noop} onInvite={onInvite} />);
    expect(screen.getByRole('heading', { name: /Pending invitations/ })).toBeInTheDocument();
    expect(screen.getByText('No pending invitations')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite members' })).toBeInTheDocument();
  });

  it('hides Resend and Revoke entirely for a non-manager, not just disables them', () => {
    render(<PendingInvitesTable invitations={[INVITE]} canManage={false} onResend={noop} onRevoke={noop} />);
    expect(screen.queryByLabelText(/^Resend invite/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Revoke invite/)).not.toBeInTheDocument();
    // The row itself still renders, read-only
    expect(screen.getByText('colleague@example.com')).toBeInTheDocument();
  });

  it('clicking Resend calls onResend immediately, no confirmation needed', async () => {
    const onResend = vi.fn();
    render(<PendingInvitesTable invitations={[INVITE]} canManage onResend={onResend} onRevoke={noop} />);
    await userEvent.click(screen.getByLabelText('Resend invite to colleague@example.com'));
    expect(onResend).toHaveBeenCalledWith(INVITE);
  });

  it('clicking Revoke opens a confirmation modal naming the invitee before calling onRevoke', async () => {
    const onRevoke = vi.fn();
    render(<PendingInvitesTable invitations={[INVITE]} canManage onResend={noop} onRevoke={onRevoke} />);
    await userEvent.click(screen.getByLabelText('Revoke invite to colleague@example.com'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/colleague@example.com will no longer be usable/)).toBeInTheDocument();
    expect(onRevoke).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(onRevoke).toHaveBeenCalledWith(INVITE);
  });

  it('canceling the revoke confirmation does not call onRevoke', async () => {
    const onRevoke = vi.fn();
    render(<PendingInvitesTable invitations={[INVITE]} canManage onResend={noop} onRevoke={onRevoke} />);
    await userEvent.click(screen.getByLabelText('Revoke invite to colleague@example.com'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRevoke).not.toHaveBeenCalled();
  });
});
