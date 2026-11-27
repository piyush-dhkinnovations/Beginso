// Team domain types. Role itself is reused verbatim from
// src/types/workspace.ts (which re-exports shared/types/Membership.ts) — not redefined.
// Owner is deliberately excluded from every grantable/assignable-role type below
// (Exclude<Role, 'owner'>) since ownership only transfers, never gets "assigned" through
// these flows.
import type { NotificationPreference } from '../../shared/types';
import type { Role } from '@/types/workspace';
import type { FormMark } from '@/types/form';

export interface MemberListItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isOwner: boolean;
  lastActiveAt: string | null;
  /** This member's response-email preference. Absent on older backends. */
  notificationPreference?: NotificationPreference;
}

// Corrected against the real live response (Beginso-Report/backend_updates_for_frontend.md
// §9.A, confirmed against production 11 Sep 2026) — the list endpoint returns `id`/`expiresAt`/
// `createdAt`, not the `token`/`invitedAt` sketched before the backend
// contract existed. No `token` is exposed here at all (reasonable: an admin browsing pending
// invites shouldn't be able to read out anyone's accept link) — resend/revoke use this `id`
// against the workspace-scoped routes, not the public token-based ones (those are for the
// invitee's own Accept page).
export interface PendingInvitation {
  id: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  status: 'pending' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface InvitationPreview {
  workspaceName: string;
  inviterName: string;
  role: Exclude<Role, 'owner'>;
  status: 'pending' | 'expired' | 'revoked' | 'accepted' | 'declined';
  invitedEmail: string;
  callerEmailMatches: boolean | null;
}

// The row key is `userId`: `DELETE /api/forms/:id/grants/:userId` takes it, not a separate grant id.
// The list sends `email`, `name`, `role` and `accessLevel` (backend form.controller.ts).
export interface FormAccessGrant {
  userId: string;
  email: string;
  /** The person's name and picture, when the server sends them (it does for the grants list). */
  name?: string;
  user?: { avatarUrl?: string | null } | null;
  role: Exclude<Role, 'owner'>;
  accessLevel: 'read' | 'write';
}

// Corrected against the real backend: the array key of the envelope is `forms`, not `shares` (a real
// runtime crash, `shares.map is not a function`, which `sharedService.list()` now guards against).
// `sharedBy` was once a bare userId; the name now arrives in several fields (see services/shared.ts).
export interface SharedFormItem {
  id: string;
  title: string;
  /** The sharer's display name, resolved from whichever of the backend's several redundant
   * fields for this actually carried one (see services/shared.ts's own mapping) — undefined,
   * never fabricated, when none of them did. */
  sharedByName?: string;
  workspaceName: string | null;
  /** The form's logo / icon (absent on an older backend). */
  branding?: FormMark;
  role: Exclude<Role, 'owner'>;
  accessLevel: 'read' | 'write';
  sharedAt: string;
}
