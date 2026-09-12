/**
 * __tests__/app/invite/[token]/page.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.5/§7.5.1, design.md §5/§15.4/§21.
 * One test per each of the six states, driven by a distinct (invitationPreview, authState)
 * pair — not a single happy-path-only test (requirements §16/§21's own bar).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InviteAcceptPage from '@/app/invite/[token]/page';
import type { InvitationPreview } from '@/types/team';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-123' }),
  useRouter: () => ({ push: mockPush }),
}));

const { mockAuthState } = vi.hoisted(() => ({
  mockAuthState: { current: { user: null as { email: string } | null, isAuthenticated: false, isLoading: false } },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState.current,
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('@/services/auth', () => ({ authService: { logout: vi.fn() } }));

const mockPreview = vi.fn();
const mockAccept = vi.fn();
const mockDecline = vi.fn();
vi.mock('@/services/invitations', () => ({
  invitationsService: {
    preview: (...args: unknown[]) => mockPreview(...args),
    accept: (...args: unknown[]) => mockAccept(...args),
    decline: (...args: unknown[]) => mockDecline(...args),
  },
}));

const BASE: InvitationPreview = {
  workspaceName: 'Acme Marketing',
  inviterName: 'Priya Sharma',
  role: 'member',
  status: 'pending',
  invitedEmail: 'sam@example.com',
  callerEmailMatches: null,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InviteAcceptPage />
    </QueryClientProvider>
  );
}

describe('InviteAcceptPage (/invite/[token])', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPreview.mockReset();
    mockAccept.mockReset();
    mockDecline.mockReset();
    mockAuthState.current = { user: null, isAuthenticated: false, isLoading: false };
  });

  it('not signed in: shows workspace/inviter/role and sign-in/sign-up links carrying ?next=', async () => {
    mockPreview.mockResolvedValue(BASE);
    renderPage();

    expect(await screen.findByText(/You are invited to join Acme Marketing/)).toBeInTheDocument();
    expect(screen.getByText(/Priya Sharma invited you as a Editor/)).toBeInTheDocument();

    const signIn = screen.getByRole('link', { name: 'Sign in to accept' });
    expect(signIn).toHaveAttribute('href', '/login?next=%2Finvite%2Ftok-123');
    const signUp = screen.getByRole('link', { name: 'Sign up' });
    expect(signUp).toHaveAttribute('href', '/signup?next=%2Finvite%2Ftok-123');
  });

  it('signed in, matching email: Accept calls accept() and navigates into the workspace', async () => {
    mockAuthState.current = { user: { email: 'sam@example.com' }, isAuthenticated: true, isLoading: false };
    mockPreview.mockResolvedValue({ ...BASE, callerEmailMatches: true });
    mockAccept.mockResolvedValue({ workspace: { id: 'w1', slug: 'acme-marketing', name: 'Acme Marketing' } });
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(mockAccept).toHaveBeenCalledWith('tok-123'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/w/acme-marketing'));
  });

  it('signed in, wrong account: shows the mismatch panel with a Switch account action, no accept/decline', async () => {
    mockAuthState.current = { user: { email: 'other@example.com' }, isAuthenticated: true, isLoading: false };
    mockPreview.mockResolvedValue({ ...BASE, callerEmailMatches: false });
    renderPage();

    expect(await screen.findByText(/signed in as other@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/this invite is for sam@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch account' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('already a member: routes straight in via a single action, no accept/decline choice', async () => {
    mockAuthState.current = { user: { email: 'sam@example.com' }, isAuthenticated: true, isLoading: false };
    mockPreview.mockResolvedValue({ ...BASE, status: 'accepted', callerEmailMatches: true });
    mockAccept.mockResolvedValue({ workspace: { id: 'w1', slug: 'acme-marketing', name: 'Acme Marketing' } });
    renderPage();

    expect(await screen.findByText(/You're already a member/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to workspace' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/w/acme-marketing'));
  });

  it('expired: states the expiry, no accept action', async () => {
    mockPreview.mockResolvedValue({ ...BASE, status: 'expired' });
    renderPage();

    expect(await screen.findByText('This invite has expired')).toBeInTheDocument();
    expect(screen.getByText(/Ask Priya Sharma to send a new invite link/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('revoked: distinct copy from expired, no accept action', async () => {
    mockPreview.mockResolvedValue({ ...BASE, status: 'revoked' });
    renderPage();

    expect(await screen.findByText('This invite was revoked')).toBeInTheDocument();
    expect(screen.getByText(/Ask Priya Sharma for a new invite if you still need access/)).toBeInTheDocument();
    expect(screen.queryByText('This invite has expired')).not.toBeInTheDocument();
  });

  it('declined: clicking Decline swaps in the declined panel without a further accept attempt', async () => {
    mockAuthState.current = { user: { email: 'sam@example.com' }, isAuthenticated: true, isLoading: false };
    mockPreview.mockResolvedValue({ ...BASE, callerEmailMatches: true });
    mockDecline.mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(mockDecline).toHaveBeenCalledWith('tok-123'));
    expect(await screen.findByText('Invitation declined')).toBeInTheDocument();
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it('token does not exist (404): plain message, no retry', async () => {
    mockPreview.mockRejectedValue(Object.assign(new Error('not found'), { response: { status: 404 } }));
    renderPage();

    expect(await screen.findByText("This invitation doesn't exist")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('network error: distinct message with Retry', async () => {
    mockPreview.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText("This link isn't working")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('role="status" is present on the resolved state panel for screen reader announcement', async () => {
    mockPreview.mockResolvedValue(BASE);
    renderPage();
    await screen.findByText(/You are invited to join/);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
