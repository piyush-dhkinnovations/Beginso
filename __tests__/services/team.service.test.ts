/**
 * __tests__/services/team.service.test.ts
 * Feature: sprint-9-team-permissions, requirements.md §7.2, design.md §12.
 * Built against the documented (not yet live) contract — see teamService's own comment.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { teamService } from '@/services/team';
import type { MemberListItem } from '@/types/team';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

const MEMBER: MemberListItem = {
  membershipId: 'm1',
  userId: 'u1',
  name: 'Priya Sharma',
  email: 'priya@example.com',
  avatarUrl: null,
  role: 'admin',
  isOwner: false,
  lastActiveAt: '2026-09-10T00:00:00.000Z',
};

describe('teamService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('listMembers() calls GET .../members and unwraps a { members } envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { members: [MEMBER] } });

    const result = await teamService.listMembers('w1');

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/w1/members');
    expect(result).toEqual([MEMBER]);
  });

  it('listMembers() falls back to a bare array if the response is ever shaped that way', async () => {
    mockGet.mockResolvedValueOnce({ data: [MEMBER] });

    const result = await teamService.listMembers('w1');

    expect(result).toEqual([MEMBER]);
  });

  it('updateMemberRole() PATCHes the membership with the new role', async () => {
    mockPatch.mockResolvedValueOnce({ data: {} });

    await teamService.updateMemberRole('w1', 'm1', 'viewer');

    expect(mockPatch).toHaveBeenCalledWith('/api/workspaces/w1/members/m1', { role: 'viewer' });
  });

  it('removeMember() DELETEs the membership', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });

    await teamService.removeMember('w1', 'm1');

    expect(mockDelete).toHaveBeenCalledWith('/api/workspaces/w1/members/m1');
  });
});
