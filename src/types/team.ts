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

export interface PendingInvitation {
  token: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  status: 'pending' | 'expired';
  invitedAt: string;
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
