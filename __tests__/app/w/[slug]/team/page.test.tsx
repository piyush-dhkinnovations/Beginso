/**
 * __tests__/app/w/[slug]/team/page.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.2/§7.3, design.md §15.1/§17.
 * Day 2 adds Pending Invites card + Invite Members modal on top of Day 1's Members card.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamPage from '@/app/w/[slug]/team/page';
import type { MemberListItem, PendingInvitation } from '@/types/team';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-admin', name: 'Priya', email: 'priya@example.com' } }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockList = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: { list: (...args: unknown[]) => mockList(...args) },
}));

const mockListMembers = vi.fn();
const mockUpdateMemberRole = vi.fn();
const mockRemoveMember = vi.fn();
vi.mock('@/services/team', () => ({
  teamService: {
    listMembers: (...args: unknown[]) => mockListMembers(...args),
    updateMemberRole: (...args: unknown[]) => mockUpdateMemberRole(...args),
    removeMember: (...args: unknown[]) => mockRemoveMember(...args),
  },
}));

const mockListPending = vi.fn();
const mockSend = vi.fn();
const mockResend = vi.fn();
const mockRevoke = vi.fn();
vi.mock('@/services/invitations', () => ({
  invitationsService: {
    listPending: (...args: unknown[]) => mockListPending(...args),
    send: (...args: unknown[]) => mockSend(...args),
    resend: (...args: unknown[]) => mockResend(...args),
    revoke: (...args: unknown[]) => mockRevoke(...args),
  },
}));

const ADMIN: MemberListItem = {
  membershipId: 'm-admin',
  userId: 'u-admin',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  avatarUrl: null,
  role: 'admin',
  isOwner: false,
  lastActiveAt: null,
};

// A different member from the mocked caller (u-admin) — MemberTable never shows a remove
// action on the caller's own row, so removal tests need someone else's row.
const OTHER_MEMBER: MemberListItem = {
  membershipId: 'm-other',
  userId: 'u-other',
  name: 'Chidi Okafor',
  email: 'chidi@example.com',
  avatarUrl: null,
  role: 'member',
  isOwner: false,
  lastActiveAt: null,
};

const INVITE: PendingInvitation = {
  id: 'inv-1',
  email: 'new@example.com',
  role: 'member',
  status: 'pending',
  expiresAt: '2026-09-18T12:00:00.000Z',
  createdAt: '2026-09-11T12:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamPage />
    </QueryClientProvider>
  );
}

describe('TeamPage (/w/[slug]/team)', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockList.mockReset();
    mockListMembers.mockReset();
    mockUpdateMemberRole.mockReset();
    mockRemoveMember.mockReset();
    mockListPending.mockReset();
    mockSend.mockReset();
    mockResend.mockReset();
    mockRevoke.mockReset();
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'admin' }]);
    mockListPending.mockResolvedValue([]);
  });

  it('renders the page heading', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    expect(await screen.findByText('Team & Members')).toBeInTheDocument();
    // The subtitle states facts (counts), not a tagline.
    expect(screen.getByText('1 member · 0 pending invitations')).toBeInTheDocument();
  });

  it('shows an error alert with retry when the members query fails', async () => {
    mockListMembers.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByText('We could not load your team.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('a caller with role=admin can edit roles (canManage derived from the already-live list endpoint)', async () => {
    mockListMembers.mockResolvedValue([OTHER_MEMBER]);
    renderPage();
    expect(await screen.findByLabelText('Change role for Chidi Okafor')).toBeInTheDocument();
  });

  it('a caller with role=admin cannot edit or remove another admin (only the owner can)', async () => {
    mockListMembers.mockResolvedValue([ADMIN, OTHER_MEMBER]);
    renderPage();
    await screen.findByLabelText('Change role for Chidi Okafor');
    expect(screen.queryByLabelText('Change role for Priya Sharma')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Priya Sharma')).not.toBeInTheDocument();
  });

  it('a caller with role=admin is offered "Leave workspace", the owner is not', async () => {
    mockListMembers.mockResolvedValue([OTHER_MEMBER]);
    renderPage();
    expect(await screen.findByRole('button', { name: 'Leave workspace' })).toBeInTheDocument();
  });

  it('a caller with role=viewer gets the no-access state, not the member table', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    await screen.findByText('You do not have access to manage this team.');
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
  });

  it('changing a role calls teamService.updateMemberRole and invalidates the members query', async () => {
    mockListMembers.mockResolvedValue([OTHER_MEMBER]);
    mockUpdateMemberRole.mockResolvedValue(undefined);
    renderPage();
    const select = await screen.findByLabelText('Change role for Chidi Okafor');
    await userEvent.selectOptions(select, 'Reviewer');
    await waitFor(() => expect(mockUpdateMemberRole).toHaveBeenCalledWith('acme', 'm-other', 'viewer'));
  });

  it('removing a member calls teamService.removeMember after confirmation', async () => {
    mockListMembers.mockResolvedValue([ADMIN, OTHER_MEMBER]);
    mockRemoveMember.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Remove Chidi Okafor'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledWith('acme', 'm-other'));
  });

  it('a manager sees the Pending Invites card and the Invite Members action', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockResolvedValue([INVITE]);
    renderPage();
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite Members' })).toBeInTheDocument();
  });

  it('a non-manager gets the no-access state: no Pending Invites card, no Invite Members action', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockResolvedValue([INVITE]);
    renderPage();
    await screen.findByText('You do not have access to manage this team.');
    expect(screen.queryByText('new@example.com')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite Members' })).not.toBeInTheDocument();
  });

  it('shows an error alert with retry when the invitations query fails', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByText('We could not load pending invites.')).toBeInTheDocument();
  });

  it('clicking Invite Members opens the modal and submitting calls invitationsService.send', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockResolvedValue([]);
    mockSend.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Invite Members' }));
    await userEvent.type(screen.getByLabelText('Email Addresses'), 'sam@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send Invites' }));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('acme', ['sam@example.com'], 'member'));
  });

  it('clicking Resend on a pending invite calls invitationsService.resend', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockResolvedValue([INVITE]);
    mockResend.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Resend invite to new@example.com'));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('acme', 'inv-1'));
  });

  it('revoking a pending invite calls invitationsService.revoke after confirmation', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockListPending.mockResolvedValue([INVITE]);
    mockRevoke.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Revoke invite to new@example.com'));
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('acme', 'inv-1'));
  });

  // Sprint 9 Day 4 — requirements.md §7.6: reachable from the Team page, by anyone (not gated
  // behind canManage, unlike Invite Members), since it's a read-only reference.
  it('clicking Roles & Permissions navigates to /w/[slug]/roles', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Roles & Permissions' }));
    expect(mockPush).toHaveBeenCalledWith('/w/acme/roles');
  });

  it('a non-manager does not get the Roles & Permissions action here (reachable from the sidebar instead)', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    await screen.findByText('You do not have access to manage this team.');
    expect(screen.queryByRole('button', { name: 'Roles & Permissions' })).not.toBeInTheDocument();
  });

  // Sprint 10, tasks.md 4.6 — the wireframe's "View Audit Log →" link, owner/admin only.
  it('an admin sees a View Audit Log link to /w/[slug]/audit', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    expect(await screen.findByRole('link', { name: 'View Audit Log →' })).toHaveAttribute('href', '/w/acme/audit');
  });

  it.each(['member', 'viewer'] as const)('a role=%s does not see the View Audit Log link', async (role) => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role }]);
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    await screen.findByText('You do not have access to manage this team.');
    expect(screen.queryByRole('link', { name: 'View Audit Log →' })).not.toBeInTheDocument();
  });
});
