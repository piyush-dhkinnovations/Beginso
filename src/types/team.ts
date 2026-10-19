// Sprint 9 domain types (design.md §13). Role itself is reused verbatim from
// src/types/workspace.ts (which re-exports shared/types/Membership.ts) — not redefined.
// Owner is deliberately excluded from every grantable/assignable-role type below
// (Exclude<Role, 'owner'>) since ownership only transfers, never gets "assigned" through
// these flows (requirements.md §7.2, §7.4).
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
  /** Sprint 14 (OQ-2): this member's response-email preference. Absent on older backends. */
  notificationPreference?: NotificationPreference;
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

// Corrected Day 5 against `API_CONTRACT.md`'s "Sprint 9 — Team & Permissions Contracts" §BE 0.6
// (code-complete/live, confirmed by direct probe of the real backend, not the pre-backend design
// sketch this originally matched). The real `FormAccessGrant` model is `{ formId, userId, role,
// grantedBy }` — no `id`/`grantedAt` — and `DELETE /api/forms/:id/grants/:userId` is keyed by
// `userId`, not a separate grant id, so `userId` is this type's row key now. The list/create
// responses are documented as "returning both role and accessLevel" but the full item shape
// (specifically whether `email` comes back at all, e.g. via a populated `userId`) is NOT
// confirmed against a live authenticated response — kept as a best-effort field, matching the
// panel's UI requirement (requirements.md §7.8's "existing-grants list (email, role, revoke)"),
// but flagged here rather than asserted as verified.
export interface FormAccessGrant {
  userId: string;
  email: string;
  role: Exclude<Role, 'owner'>;
  accessLevel: 'read' | 'write';
}

// Corrected twice against the real backend. First pass (against `API_CONTRACT.md`'s summary)
// fixed the field names but guessed `sharedBy` as `{ name: string }`, matching the original
// design sketch — wrong. `Beginso-Report/backend_updates_for_frontend.md` §13 gives the actual
// response as a full JSON example: `sharedBy` is a raw `userId` string (e.g.
// `"66db1e2f89c4a73b22019a11"`), not a populated object — the backend does not enrich it with a
// display name. `SharedFormCard` cannot show "Shared by {name}" until the backend adds that
// (flagged as backend action required, not invented here). The envelope's array key is also
// `forms`, not `shares` — this caused a real runtime crash (`shares.map is not a function`)
// before it was caught; `sharedService.list()` now guards against a repeat.
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
