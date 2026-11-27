import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { MemberListItem } from '@/types/team';
import type { Role } from '@/types/workspace';
import type { NotificationPreference } from '../../shared/types';

// Envelope unwrapped defensively (workspaces.ts's own established reasoning).
export const teamService = {
  listMembers: (workspaceId: string): Promise<MemberListItem[]> =>
    axiosInstance
      .get(`/api/workspaces/${workspaceId}/members`)
      .then((r) => unwrapEnvelope<MemberListItem[]>(r.data, 'members')),

  // The caller's OWN response-email preference. PATCH /api/workspaces/:id/preferences
  // (:id is an id or slug); returns { preferences: { notificationPreference, timezoneOverride } }.
  updateMyNotificationPreference: (workspaceId: string, notificationPreference: NotificationPreference): Promise<NotificationPreference> =>
    axiosInstance
      .patch(`/api/workspaces/${workspaceId}/preferences`, { notificationPreference })
      .then((r) => unwrapEnvelope<{ notificationPreference?: NotificationPreference }>(r.data, 'preferences').notificationPreference ?? notificationPreference),

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
