import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type { FormAccessGrant } from '@/types/team';
import type { Role } from '@/types/workspace';

// Sprint 9 Day 5 — real bug found and fixed the same day, before commit: this originally called
// `/api/forms/:id/access` per design.md §11.2's pre-backend placeholder sketch. A direct probe of
// the live backend (`API_CONTRACT.md`'s "Sprint 9 — Team & Permissions Contracts" §BE 0.6, code-
// complete 11 Sep 2026) showed the real, already-shipped route is `/api/forms/:id/grants`
// (`GET`/`POST`) and `DELETE /api/forms/:id/grants/:userId` — keyed by the grantee's `userId`, not
// a separate `grantId`. `/access` 404s on the real backend (confirmed: Express's own "Cannot GET"
// 404, not a business-logic one — the route was never registered there at all). Corrected here to
// match the documented contract exactly, same "build against the real shape, not the pre-backend
// sketch" precedent team.ts/invitations.ts both used once their own backends went live.
export const formAccessService = {
  // The list envelope's exact key is unconfirmed — no JSON example exists for this endpoint in
  // `Beginso-Report/backend_updates_for_frontend.md` §12 (unlike §13's shared-with-me, whose
  // documented key turned out to differ from this file's original guess and crashed at runtime
  // — `shares.map is not a function`). Guarded the same way here rather than trusting the guess.
  listGrants: (formId: string): Promise<FormAccessGrant[]> =>
    axiosInstance.get(`/api/forms/${formId}/grants`).then((r) => {
      const unwrapped = unwrapEnvelope<unknown>(r.data, 'grants');
      return Array.isArray(unwrapped) ? (unwrapped as FormAccessGrant[]) : [];
    }),

  grant: (formId: string, email: string, role: Exclude<Role, 'owner'>): Promise<FormAccessGrant> =>
    axiosInstance
      .post(`/api/forms/${formId}/grants`, { email, role })
      .then((r) => unwrapEnvelope<FormAccessGrant>(r.data, 'grant')),

  revoke: (formId: string, userId: string): Promise<void> =>
    axiosInstance.delete(`/api/forms/${formId}/grants/${userId}`).then(() => undefined),
};
