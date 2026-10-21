import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEventAvatars } from '@/hooks/useEventAvatars';
import type { WorkspaceEventItem } from '@/types/event';

const listMembers = vi.fn();
const listWorkspaces = vi.fn();
vi.mock('@/services/team', () => ({ teamService: { listMembers: (...a: unknown[]) => listMembers(...a) } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: (...a: unknown[]) => listWorkspaces(...a) } }));

const event = (over: Partial<WorkspaceEventItem> = {}): WorkspaceEventItem => ({
  id: 'e1',
  actorName: 'Piyush Prajapat',
  action: 'form.publish',
  targetType: 'form',
  targetId: 'f1',
  targetLabel: 'Survey',
  createdAt: '2026-10-21T10:00:00.000Z',
  ...over,
});

const MEMBERS = [
  { membershipId: 'm1', userId: 'u1', name: 'Piyush Prajapat', email: 'Piyush@Example.com', avatarUrl: 'https://cdn.example.com/a/piyush.png', role: 'owner', isOwner: true, lastActiveAt: null },
  { membershipId: 'm2', userId: 'u2', name: 'No Picture', email: 'plain@example.com', avatarUrl: null, role: 'member', isOwner: false, lastActiveAt: null },
];
const WORKSPACES = [{ id: 'w1', slug: 'acme', name: 'Kala Chashma Entertainment', role: 'admin', logo: 'https://cdn.example.com/logo.png' }];

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const mount = (scope: string | undefined = 'acme') => renderHook(() => useEventAvatars(scope), { wrapper });

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  listMembers.mockReset().mockResolvedValue(MEMBERS);
  listWorkspaces.mockReset().mockResolvedValue(WORKSPACES);
});

describe('useEventAvatars', () => {
  it('uses the picture the backend sent with the event first, for any role (no team lookup needed)', () => {
    listMembers.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403 } }));
    const { result } = mount();
    expect(result.current(event({ actorAvatarUrl: 'https://cdn.example.com/from-event.png', actorId: 'u1' }))).toBe('https://cdn.example.com/from-event.png');
  });

  it("falls back to the member's own picture, matched by user id", async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current(event({ actorId: 'u1' }))).toBe('https://cdn.example.com/a/piyush.png'));
  });

  it('then by email, ignoring case, when the event has no user id', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current(event({ actorEmail: 'piyush@example.com' }))).toBe('https://cdn.example.com/a/piyush.png'));
  });

  it('gives nothing (so initials show) for a member without a picture, or someone unknown', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current(event({ actorId: 'u1' }))).toBeDefined());
    expect(result.current(event({ actorId: 'u2' }))).toBeUndefined();
    expect(result.current(event({ actorId: 'nobody', actorEmail: 'who@example.com', actorName: 'Who' }))).toBeUndefined();
  });

  it("shows the workspace logo for the workspace's own events (no account behind them, named after it)", async () => {
    const { result } = mount();
    const own = event({ actorName: 'Kala Chashma Entertainment', actorId: undefined });
    await waitFor(() => expect(result.current(own)).toBe('https://cdn.example.com/logo.png'));
    expect(result.current({ ...own, actorName: '  kala chashma entertainment ' })).toBe('https://cdn.example.com/logo.png');
  });

  it('but never gives a person the logo: an actor with an account, or another name, keeps their own', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current(event({ actorName: 'Kala Chashma Entertainment' }))).toBe('https://cdn.example.com/logo.png'));
    expect(result.current(event({ actorName: 'Kala Chashma Entertainment', actorId: 'u2' }))).toBeUndefined();
    expect(result.current(event({ actorName: 'Respondent' }))).toBeUndefined();
  });

  it('does not fail when the team list is refused (only admins can read it)', async () => {
    listMembers.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403 } }));
    const { result } = mount();
    await waitFor(() => expect(listMembers).toHaveBeenCalled());
    expect(result.current(event({ actorId: 'u1' }))).toBeUndefined();
  });

  it.each(['member', 'editor', 'viewer', 'reviewer'])('never asks a %s for the team list (it would be refused), and still shows the picture sent with the event', async (role) => {
    listWorkspaces.mockResolvedValue([{ ...WORKSPACES[0], role }]);
    const { result } = mount();
    // the workspace has loaded once its logo can be used
    await waitFor(() => expect(result.current(event({ actorName: 'Kala Chashma Entertainment' }))).toBe('https://cdn.example.com/logo.png'));
    expect(listMembers).not.toHaveBeenCalled();
    expect(result.current(event({ actorAvatarUrl: 'https://cdn.example.com/from-event.png' }))).toBe('https://cdn.example.com/from-event.png');
    expect(result.current(event({ actorId: 'u1' }))).toBeUndefined(); // no fallback for them, so initials
  });

  it('asks admins and owners for it (the fallback for a backend that sends no picture yet)', async () => {
    for (const role of ['admin', 'owner']) {
      listMembers.mockClear();
      qc.clear();
      listWorkspaces.mockResolvedValue([{ ...WORKSPACES[0], role }]);
      const { result, unmount } = mount();
      await waitFor(() => expect(result.current(event({ actorId: 'u1' }))).toBe('https://cdn.example.com/a/piyush.png'));
      expect(listMembers).toHaveBeenCalled();
      unmount();
    }
  });

  it('does not ask until the role is known', async () => {
    listWorkspaces.mockReturnValue(new Promise(() => {}));
    mount();
    await new Promise((r) => setTimeout(r, 30));
    expect(listMembers).not.toHaveBeenCalled();
  });

  it('does not ask for anything in the personal space', () => {
    mount('personal');
    renderHook(() => useEventAvatars(undefined), { wrapper });
    expect(listMembers).not.toHaveBeenCalled();
    expect(listWorkspaces).not.toHaveBeenCalled();
  });
});
