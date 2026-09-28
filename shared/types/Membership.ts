import type { WorkspaceId } from './Workspace';

export type MembershipId = string;
export type UserId = string;

// Corrected Sprint 8 Day 1 against the live backend (Beginso-Report/CHANGELOG.md 2026-09-07,
// Beginso-Report/API_CONTRACT.md `Membership.role`): lowercase, and 'member'/'viewer' — not the
// capitalized 'Editor'/'Reviewer' this scaffold originally guessed at in Sprint 7. The V2 master
// feature list's C2.1 names Owner/Admin/Editor/Reviewer as the product-facing role concept; the
// backend has implemented that concept under different wire values. Sprint 9 (C2.9, roles UI) is
// where a product decision is needed on whether the backend enum gets renamed to match, or the
// frontend maps wire values to display labels — flagging here since Sprint 8 is the first consumer
// that reads `role` at all (context switcher, All Workspaces). Not resolved silently either way.
// The backend stores six values (Beginso-Report/API_CONTRACT.md "Roles"): `editor` is an alias of
// `member` and `reviewer` an alias of `viewer`. A member row can carry any of the six on the wire
// (a role set through per-form grants or an older invitation), so every consumer must accept all
// six; ROLE_LABELS and CAPABILITIES in src/lib/roles.ts treat each alias like its twin.
export type Role = 'owner' | 'admin' | 'member' | 'editor' | 'viewer' | 'reviewer';

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
