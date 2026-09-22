import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { PendingInvitation, InvitationPreview } from '@/types/team';
import type { Role } from '@/types/workspace';

// Built against the confirmed-live contract (Beginso-Report/backend_updates_for_frontend.md §9,
// production-verified 11 Sep 2026), not design.md §12's original pre-backend sketch — two real
// deviations found and adapted, not silently kept:
// 1. send() takes one email per POST, not a batch — the live endpoint's body is
//    `{ email, role }` (singular), so a multi-email invite fires one request per address.
//    Uses Promise.all deliberately, not allSettled: if any address fails the whole submission
//    fails and the modal stays open (mirrors CreateWorkspaceModal's single error-path pattern,
//    design.md §6) — safe to just hit Send again, since the backend's own duplicate-pending
//    handling (BE 0.3) updates rather than re-creates any invite that already went through.
// 2. resend()/revoke() use the workspace-scoped routes with the invitation's `id`, not the flat
//    token-based ones design.md sketched — the list endpoint never exposes a `token` per
//    invitation (reasonably: an admin browsing pending invites shouldn't be able to read out
//    anyone's accept link), only an `id`. The flat token routes exist too (dual-routing, per the
//    same doc) but only the invitee's own Accept page has a token to use them with.
export const invitationsService = {
  // Real bug found and fixed: `GET /api/workspaces/:id/invitations` returns the workspace's full
  // invitation history — every status (`accepted`, `revoked`, `declined`, ...), not just the
  // still-actionable ones `PendingInvitation`'s own type always assumed. Revoking an
  // already-accepted or just-revoked row therefore looked like it "did nothing": the POST
  // succeeded server-side (status flips to `revoked`), but the row never left this unfiltered
  // list, so it stayed on screen with its Resend/Revoke actions still showing. Filtered here, at
  // the trust boundary, so "listPending" actually only returns pending/expired invitations.
  listPending: (workspaceId: string): Promise<PendingInvitation[]> =>
    axiosInstance
      .get(`/api/workspaces/${workspaceId}/invitations`)
      .then((r) => unwrapEnvelope<PendingInvitation[]>(r.data, 'invitations'))
      .then((invitations) =>
        (Array.isArray(invitations) ? invitations : []).filter(
          (i) => i.status === 'pending' || i.status === 'expired'
        )
      ),

  send: (workspaceId: string, emails: string[], role: Exclude<Role, 'owner'>): Promise<PendingInvitation[]> =>
    Promise.all(
      emails.map((email) =>
        axiosInstance
          .post(`/api/workspaces/${workspaceId}/invitations`, { email, role })
          .then((r) => unwrapEnvelope<PendingInvitation>(r.data, 'invitation'))
      )
    ),

  resend: (workspaceId: string, invitationId: string): Promise<void> =>
    axiosInstance
      .post(`/api/workspaces/${workspaceId}/invitations/${invitationId}/resend`)
      .then(() => undefined),

  revoke: (workspaceId: string, invitationId: string): Promise<void> =>
    axiosInstance
      .post(`/api/workspaces/${workspaceId}/invitations/${invitationId}/revoke`)
      .then(() => undefined),

  // Public, token-based — Wednesday's Invite Accept page (task 5.1) is the consumer. Built now
  // since task 2.2 bundles all seven methods as one unit; not wired into any UI today.
  preview: (token: string): Promise<InvitationPreview> =>
    axiosInstance
      .get(`/api/invitations/${token}`)
      .then((r) => unwrapEnvelope<InvitationPreview>(r.data, 'invitation')),

  // unwrapEnvelope() defensively pulls `workspace` out of whatever envelope the real response
  // uses (matches every sibling method) — `accept()` previously returned `r.data` bare, assuming
  // the pre-backend design sketch's `{workspace: {...}}` shape was the literal wire response.
  // A live backend error surfaced that assumption doesn't always hold: the caller then reads
  // `.slug` off `undefined` and crashes instead of failing gracefully.
  accept: (token: string): Promise<{ id: string; slug: string; name: string }> =>
    axiosInstance
      .post(`/api/invitations/${token}/accept`)
      .then((r) => unwrapEnvelope<{ id: string; slug: string; name: string }>(r.data, 'workspace')),

  decline: (token: string): Promise<void> =>
    axiosInstance.post(`/api/invitations/${token}/decline`).then(() => undefined),
};
