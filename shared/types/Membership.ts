import type { WorkspaceId } from './Workspace';

export type MembershipId = string;
export type UserId = string;

export type Role = 'Owner' | 'Admin' | 'Editor' | 'Reviewer';

/**
 * P1: per-member notification preference. Defaults to "none" for every
 * member except the form's creator, who defaults to "all" — enforced at
 * write time, not by this type.
 */
export type NotificationPreference = 'all' | 'mine' | 'none';

export interface Membership {
  id: MembershipId;
  workspaceId: WorkspaceId;
  userId: UserId;
  role: Role;
  notificationPreference: NotificationPreference;
  /**
   * P2: optional per-user override of Workspace.timezone (IANA string).
   * Falls back to the workspace default when unset.
   */
  timezoneOverride?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * P3: assignment is nullable. A response's assignee is a MembershipId or
 * null ("Unassigned"). Removing a member unassigns every response they
 * held rather than orphaning the reference — see F16 offboarding.
 */
export type AssigneeRef = MembershipId | null;
