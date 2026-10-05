/**
 * Sprint 13 (A5.1–A5.4), design.md §12. Two doors, kept apart on purpose:
 *
 *  • TOKEN calls (`getLink`, `editViaLink`, `resend`) use plain `fetch` straight to the API, exactly like
 *    `publicForm.ts`: the signed link IS the credential, so no cookie is ever attached and the BFF is not in
 *    the path. Every one is `cache: 'no-store'`, and the token is never logged or stored by this file.
 *  • SESSION calls (`claim`, `mine`, `detail`, `edit`) go through `axiosInstance` / the BFF like any
 *    signed-in call.
 *
 * Nothing returned here ever contains a stage name, tag, assignee, note or score — the backend never sends one.
 */
import axiosInstance from '@/lib/axios';
import type { LinkState, MySubmission, RespondLinkView, RespondLinkField } from '@/types/respondent';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface LinkViewResult {
  /** HTTP status of the call — 200 valid/used, 410 expired, 404 invalid. */
  httpStatus: number;
  view: RespondLinkView;
}

const asState = (value: unknown): LinkState =>
  value === 'valid' || value === 'expired' || value === 'used' ? value : 'invalid';

export const respondentService = {
  /** GET /api/respond/:token. Never throws on 404/410 — those ARE the answer; only a network failure throws. */
  async getLink(token: string): Promise<LinkViewResult> {
    const res = await fetch(`${BASE}/api/respond/${encodeURIComponent(token)}`, { cache: 'no-store', credentials: 'omit' });
    const body = (await res.json().catch(() => ({}))) as Partial<RespondLinkView>;
    if (res.status >= 500) throw new Error(`Failed to load link: ${res.status}`);
    return {
      httpStatus: res.status,
      view: {
        ...body,
        state: res.status === 404 ? 'invalid' : res.status === 410 ? 'expired' : asState(body.state),
        fields: Array.isArray(body.fields) ? (body.fields as RespondLinkField[]) : undefined,
      },
    };
  },

  /** PATCH /api/respond/:token — `answers` maps fieldId → new value. */
  async editViaLink(
    token: string,
    answers: Record<string, unknown>
  ): Promise<{ ok: boolean; status: number; editedAfterReview?: boolean; message?: string; code?: string }> {
    const res = await fetch(`${BASE}/api/respond/${encodeURIComponent(token)}`, {
      method: 'PATCH',
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      editedAfterReview: body?.editedAfterReview,
      message: body?.error?.message ?? body?.message,
      code: body?.error?.code,
    };
  },

  /** POST /api/respond/resend — always 202; the response never reveals whether anything matched. */
  async resend(email: string, slug: string): Promise<void> {
    await fetch(`${BASE}/api/respond/resend`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, slug }),
    }).catch(() => undefined);
  },

  /** POST /api/respond/:token/claim — needs the session of the account just created FROM the link. */
  claim: (token: string) =>
    axiosInstance.post<{ linked?: number }>(`/api/respond/${encodeURIComponent(token)}/claim`).then((r) => ({ linked: r.data?.linked ?? 0 })),

  /** GET /api/my-submissions. */
  mine: (): Promise<MySubmission[]> =>
    axiosInstance.get('/api/my-submissions').then((r) => {
      const items = (r.data as { items?: unknown })?.items ?? r.data;
      return Array.isArray(items) ? (items as MySubmission[]) : [];
    }),

  /** GET /api/my-submissions/:id — null when it is not mine / does not exist. */
  detail: (id: string) =>
    axiosInstance
      .get<RespondLinkView & { id?: string }>(`/api/my-submissions/${id}`)
      .then((r) => ({ ...r.data, state: 'valid' as const })),

  edit: (id: string, answers: Record<string, unknown>) =>
    axiosInstance
      .patch<{ ok?: boolean; editedAfterReview?: boolean }>(`/api/my-submissions/${id}`, { answers })
      .then((r) => ({ editedAfterReview: !!r.data?.editedAfterReview })),
};
