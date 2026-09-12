/**
 * __tests__/services/invitations.service.test.ts
 * Feature: sprint-9-team-permissions, requirements.md §7.3/§7.4, design.md §12.
 * send()/resend()/revoke() built against the confirmed-live contract, not design.md's original
 * pre-backend sketch — see invitations.ts's own comment for the two deviations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { invitationsService } from '@/services/invitations';
import type { PendingInvitation } from '@/types/team';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;

const INVITE: PendingInvitation = {
  id: 'inv-1',
  email: 'colleague@example.com',
  role: 'member',
  status: 'pending',
  expiresAt: '2026-09-18T12:00:00.000Z',
  createdAt: '2026-09-11T12:00:00.000Z',
};

describe('invitationsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('listPending() calls GET .../invitations and unwraps an { invitations } envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { invitations: [INVITE] } });

    const result = await invitationsService.listPending('w1');

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/w1/invitations');
    expect(result).toEqual([INVITE]);
  });

  it('send() fires one POST per email, not a single batch request', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { invitation: { ...INVITE, email: 'a@example.com' } } })
      .mockResolvedValueOnce({ data: { invitation: { ...INVITE, email: 'b@example.com' } } });

    const result = await invitationsService.send('w1', ['a@example.com', 'b@example.com'], 'member');

    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenNthCalledWith(1, '/api/workspaces/w1/invitations', {
      email: 'a@example.com',
      role: 'member',
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/workspaces/w1/invitations', {
      email: 'b@example.com',
      role: 'member',
    });
    expect(result).toHaveLength(2);
  });

  it('send() rejects the whole submission if any single email fails', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { invitation: INVITE } })
      .mockRejectedValueOnce(new Error('invalid email'));

    await expect(invitationsService.send('w1', ['a@example.com', 'bad'], 'member')).rejects.toThrow(
      'invalid email'
    );
  });

  it('resend() posts to the workspace-scoped route using the invitation id, not a token', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });

    await invitationsService.resend('w1', 'inv-1');

    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/w1/invitations/inv-1/resend');
  });

  it('revoke() posts to the workspace-scoped route using the invitation id, not a token', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });

    await invitationsService.revoke('w1', 'inv-1');

    expect(mockPost).toHaveBeenCalledWith('/api/workspaces/w1/invitations/inv-1/revoke');
  });

  it('preview() calls the public token-based endpoint and unwraps an { invitation } envelope', async () => {
    const preview = {
      workspaceName: 'Acme',
      inviterName: 'Jane Doe',
      role: 'member' as const,
      status: 'pending' as const,
      invitedEmail: 'colleague@example.com',
      callerEmailMatches: null,
    };
    mockGet.mockResolvedValueOnce({ data: { invitation: preview } });

    const result = await invitationsService.preview('tok-123');

    expect(mockGet).toHaveBeenCalledWith('/api/invitations/tok-123');
    expect(result).toEqual(preview);
  });

  it('accept() posts to the token-based accept endpoint and unwraps the workspace envelope', async () => {
    const workspace = { id: 'w1', slug: 'acme', name: 'Acme' };
    mockPost.mockResolvedValueOnce({ data: { success: true, workspace } });

    const result = await invitationsService.accept('tok-123');

    expect(mockPost).toHaveBeenCalledWith('/api/invitations/tok-123/accept');
    expect(result).toEqual(workspace);
  });

  it('decline() posts to the token-based decline endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });

    await invitationsService.decline('tok-123');

    expect(mockPost).toHaveBeenCalledWith('/api/invitations/tok-123/decline');
  });
});
