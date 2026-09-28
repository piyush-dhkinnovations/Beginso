import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';

// Endpoints are not yet live (BE 0.1/BE 0.2, requirements.md §13 — Phase 0 of this sprint) —
// built against design.md §11.2/§12's documented contract, same "build the frontend against a
// documented-but-unconfirmed shape" precedent Sprint 7/8 both used. Envelope unwrapped
// defensively (workspaces.ts's own established reasoning) since nothing here has been exercised
// against a real response yet.
export const teamService = {
  listMembers: (workspaceId: string): Promise<MemberListItem[]> =>
    axiosInstance
      .get(`/api/workspaces/${workspaceId}/members`)
      .then((r) => unwrapEnvelope<MemberListItem[]>(r.data, 'members')),

  updateMemberRole: (workspaceId: string, membershipId: string, role: Role): Promise<void> =>
    axiosInstance
      .patch(`/api/workspaces/${workspaceId}/members/${membershipId}`, { role })
      .then(() => undefined),

  removeMember: (workspaceId: string, membershipId: string): Promise<void> =>
    axiosInstance
      .delete(`/api/workspaces/${workspaceId}/members/${membershipId}`)
      .then(() => undefined),

  // Owner only. The target must already be a member; the caller becomes an admin.
  transferOwnership: (workspaceId: string, userId: string): Promise<void> =>
    axiosInstance.post(`/api/workspaces/${workspaceId}/transfer-ownership`, { userId }).then(() => undefined),

  // Any member. The only owner is refused with LAST_OWNER (transfer ownership first).
  leave: (workspaceId: string): Promise<void> =>
    axiosInstance.post(`/api/workspaces/${workspaceId}/leave`).then(() => undefined),
};
