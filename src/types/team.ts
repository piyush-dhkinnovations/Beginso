// Sprint 9 domain types (design.md §13). Role itself is reused verbatim from
// src/types/workspace.ts (which re-exports shared/types/Membership.ts) — not redefined.
// Owner is deliberately excluded from every grantable/assignable-role type below
// (Exclude<Role, 'owner'>) since ownership only transfers, never gets "assigned" through
// these flows (requirements.md §7.2, §7.4).
import type { Role } from '@/types/workspace';

export interface MemberListItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isOwner: boolean;
  lastActiveAt: string | null;
}

// Corrected Day 2 against the real live response (Beginso-Report/backend_updates_for_frontend.md
// §9.A, confirmed against production 11 Sep 2026) — the list endpoint returns `id`/`expiresAt`/
// `createdAt`, not the `token`/`invitedAt` design.md §13 originally sketched before the backend
// contract existed. No `token` is exposed here at all (reasonable: an admin browsing pending
// invites shouldn't be able to read out anyone's accept link) — resend/revoke use this `id`
// against the workspace-scoped routes, not the public token-based ones (those are for the
// invitee's own Accept page, Wednesday's task 5.1).
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

export interface FormAccessGrant {
  id: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  grantedAt: string;
}

export interface SharedFormItem {
  formId: string;
  formTitle: string;
  sharedBy: { name: string };
  workspaceName: string | null;
  role: Exclude<Role, 'owner'>;
  updatedAt: string;
}
