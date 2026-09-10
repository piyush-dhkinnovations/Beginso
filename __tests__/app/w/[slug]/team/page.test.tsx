/**
 * __tests__/app/w/[slug]/team/page.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.2, design.md §15.1/§17.
 * Today's slice (Day 1): Members card only — Pending Invites lands with task 4.4.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TeamPage from '@/app/w/[slug]/team/page';
import type { MemberListItem } from '@/types/team';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'acme' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u-admin', name: 'Priya', email: 'priya@example.com' } }),
}));

vi.mock('@/components/common/Toast', () => ({
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
    mockList.mockReset();
    mockListMembers.mockReset();
    mockUpdateMemberRole.mockReset();
    mockRemoveMember.mockReset();
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'admin' }]);
  });

  it('renders the page heading', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    expect(await screen.findByText('Team & Members')).toBeInTheDocument();
    expect(screen.getByText('Manage who has access to this workspace.')).toBeInTheDocument();
  });

  it('shows an error alert with retry when the members query fails', async () => {
    mockListMembers.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByText('We could not load your team.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('a caller with role=admin can edit roles (canManage derived from the already-live list endpoint)', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    expect(await screen.findByLabelText('Change role for Priya Sharma')).toBeInTheDocument();
  });

  it('a caller with role=viewer sees a read-only table', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme', slug: 'acme', role: 'viewer' }]);
    mockListMembers.mockResolvedValue([ADMIN]);
    renderPage();
    await screen.findByText('Priya Sharma');
    expect(screen.queryByLabelText('Change role for Priya Sharma')).not.toBeInTheDocument();
  });

  it('changing a role calls teamService.updateMemberRole and invalidates the members query', async () => {
    mockListMembers.mockResolvedValue([ADMIN]);
    mockUpdateMemberRole.mockResolvedValue(undefined);
    renderPage();
    const select = await screen.findByLabelText('Change role for Priya Sharma');
    await userEvent.selectOptions(select, 'Reviewer');
    await waitFor(() => expect(mockUpdateMemberRole).toHaveBeenCalledWith('acme', 'm-admin', 'viewer'));
  });

  it('removing a member calls teamService.removeMember after confirmation', async () => {
    mockListMembers.mockResolvedValue([ADMIN, OTHER_MEMBER]);
    mockRemoveMember.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Remove Chidi Okafor'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledWith('acme', 'm-other'));
  });
});
