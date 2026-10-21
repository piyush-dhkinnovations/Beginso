/**
 * GET /api/public/:slug and POST /api/public/:slug/submit.
 * fetch() only — no Axios, no auth headers, no cookies.
 */

import axiosInstance from '@/lib/axios';
import type { PublicFormSchema, SubmissionData } from '@/types/publicForm';
import { reasonFromCode, type FormUnavailableReason } from '@/lib/formUnavailable';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface FormSchemaResult {
  schema: PublicFormSchema | null;
  /** Closed form's settings.successMessage, only present if the backend includes one on the 404 body. */
  userNote?: string;
  /** Set when the backend answered 410: the owner closed the form, its closing date passed, or its limit was reached. */
  unavailable?: FormUnavailableReason;
}

/** One server-side validation message. `field` is the field's LABEL; `fieldId` (newer backends) says exactly which field when labels repeat. */
export interface SubmitFieldError {
  field: string;
  fieldId?: string;
  message: string;
}

export type EmailVerificationStatus = 'pending' | 'verified' | 'expired' | 'invalid';

export const publicFormService = {
  /**
   * schema is null on 404 (draft / archived / not found, deliberately indistinguishable) and on 410 (closed, closing date
   * passed, response limit reached: `unavailable` says which). Throws on other non-ok status or network error.
   * Uncached (`cache: 'no-store'`) — a form closed on the backend must stop accepting
   * respondents immediately, not up to 60s later via a stale ISR entry.
   */
  async getFormSchema(slug: string): Promise<FormSchemaResult> {
    const res = await fetch(`${BASE}/api/public/${slug}`, {
      cache: 'no-store',
    });
    if (res.status === 410) {
      const code = await res
        .json()
        .then((body: { error?: { code?: string } }) => body?.error?.code)
        .catch(() => undefined);
      return { schema: null, unavailable: reasonFromCode(code, 410) };
    }
    if (res.status === 404) {
      const userNote = await res
        .json()
        .then((body: { settings?: { successMessage?: string } }) => body?.settings?.successMessage)
        .catch(() => undefined);
      return { schema: null, userNote };
    }
    if (!res.ok) throw new Error(`Failed to load form: ${res.status}`);
    return { schema: (await res.json()) as PublicFormSchema };
  },

  /**
   * Tells the backend a visitor opened the form (feeds the completion rate on Form Overview).
   * Fire-and-forget: it never throws and never blocks the page. The backend counts one view per
   * visitor per form per hour, so calling it on every load is safe.
   */
  recordView(slug: string): void {
    void fetch(`${BASE}/api/public/${slug}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  },

  /**
   * Mode 2 (tracked): asks the backend to email a confirmation link to this address. Returns the id that proves, later, that this
   * browser is the one that asked (it is sent with the submit; the link in the email is a different secret). Throws an Error
   * whose message is safe to show.
   */
  async requestEmailVerification(slug: string, email: string): Promise<{ verificationId: string }> {
    const res = await fetch(`${BASE}/api/public/${slug}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.verificationId) {
      throw new Error(
        res.status === 429
          ? 'Too many emails were requested. Please wait a little and try again.'
          : (body?.error?.message ?? body?.message ?? 'We could not send the verification email. Please try again.')
      );
    }
    return { verificationId: String(body.verificationId) };
  },

  /** Polled while the respondent opens the email. `invalid` means the request is unknown here or already used. */
  async getEmailVerification(slug: string, verificationId: string): Promise<{ status: EmailVerificationStatus; email?: string }> {
    const res = await fetch(`${BASE}/api/public/${slug}/verify-email/${encodeURIComponent(verificationId)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Could not check the verification: ${res.status}`);
    const body = await res.json();
    return { status: body.status as EmailVerificationStatus, email: typeof body.email === 'string' ? body.email : undefined };
  },

  /** The respondent opened the link from the email (the /confirm-email page). */
  async confirmEmailVerification(token: string): Promise<'verified' | 'expired' | 'invalid'> {
    const res = await fetch(`${BASE}/api/public/email-verification/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.status >= 500 || res.status === 429) throw new Error(`Could not confirm: ${res.status}`);
    const body = await res.json().catch(() => null);
    return body?.state === 'verified' || body?.state === 'expired' ? body.state : 'invalid';
  },

  /**
   * Mode 3 only. Goes through the same-origin BFF (it needs the member session, which the browser never holds)
   * and returns a short-lived, single-use ticket bound to this account AND this form. The browser then submits
   * directly with it, so the backend's per-file upload limit applies, not the proxy's body ceiling.
   */
  async getSubmitTicket(slug: string): Promise<{ ticket: string; expiresInSeconds: number }> {
    const r = await axiosInstance.post<{ ticket: string; expiresInSeconds?: number }>(`/api/public/${slug}/submit-ticket`);
    if (!r.data?.ticket) throw new Error('Unexpected submit-ticket response');
    return { ticket: r.data.ticket, expiresInSeconds: r.data.expiresInSeconds ?? 120 };
  },

  /**
   * Sends multipart/form-data: `data` (JSON), `_hp` (honeypot), one part per file field.
   * `honeypot` defaults to '' for real respondents — passed through as-is (not hardcoded)
   * so a bot that actually fills the hidden `_hp` input is still reported to the backend.
   */
  async submitForm(
    slug: string,
    data: SubmissionData,
    // One entry per file field; an image field can hold several files under the same part name.
    files: Record<string, File | File[]>,
    honeypot: string = '',
    // Mode 3 (login): the single-use ticket from getSubmitTicket() — sent as a form field so the direct
    // multipart POST stays a simple request. The server takes the email from the ACCOUNT, never the body.
    opts: { ticket?: string; emailVerificationId?: string } = {}
  ): Promise<{ ok: boolean; status: number; message?: string; code?: string; fieldErrors?: SubmitFieldError[] }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('_hp', honeypot);
    if (opts.ticket) formData.append('ticket', opts.ticket);
    if (opts.emailVerificationId) formData.append('emailVerificationId', opts.emailVerificationId);
    for (const [fieldId, value] of Object.entries(files)) {
      for (const file of Array.isArray(value) ? value : [value]) formData.append(fieldId, file);
    }

    const res = await fetch(`${BASE}/api/public/${slug}/submit`, {
      method: 'POST',
      body: formData,
      // No Content-Type — the browser sets it with the correct multipart boundary.
    });

    let message: string | undefined;
    let code: string | undefined;
    let fieldErrors: SubmitFieldError[] | undefined;
    if (!res.ok) {
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message;
        code = body?.error?.code; // EMAIL_REQUIRED (422) / LOGIN_REQUIRED (401) / FORM_CLOSED (410) — stable, mapped by the shell
        if (Array.isArray(body?.errors)) {
          fieldErrors = body.errors.filter((e: unknown): e is SubmitFieldError => !!e && typeof (e as SubmitFieldError).field === 'string' && typeof (e as SubmitFieldError).message === 'string');
        }
      } catch {
        // non-JSON error body — ignore
      }
    } else if (/^text\/(html|plain)/i.test(res.headers?.get?.('content-type') ?? '')) {
      // A 200 that is not the API's JSON (a proxy or captive-portal page) is not proof the response was stored: say so
      // instead of sending the respondent to a Thank-you page.
      return { ok: false, status: res.status, code: 'UNCONFIRMED' };
    }

    return { ok: res.ok, status: res.status, message, code, fieldErrors };
  },
};
