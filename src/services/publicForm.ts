/**
 * GET /api/public/:slug and POST /api/public/:slug/submit.
 * fetch() only — no Axios, no auth headers, no cookies.
 */

import axiosInstance from '@/lib/axios';
import type { PublicFormSchema, SubmissionData } from '@/types/publicForm';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface FormSchemaResult {
  schema: PublicFormSchema | null;
  /** Closed form's settings.successMessage, only present if the backend includes one on the 404 body. */
  userNote?: string;
}

export const publicFormService = {
  /**
   * schema is null on 404 (draft/closed/not found). Throws on other non-ok status or network error.
   * Uncached (`cache: 'no-store'`) — a form closed on the backend must stop accepting
   * respondents immediately, not up to 60s later via a stale ISR entry.
   */
  async getFormSchema(slug: string): Promise<FormSchemaResult> {
    const res = await fetch(`${BASE}/api/public/${slug}`, {
      cache: 'no-store',
    });
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
    files: Record<string, File>,
    honeypot: string = '',
    // Mode 3 (login): the single-use ticket from getSubmitTicket() — sent as a form field so the direct
    // multipart POST stays a simple request. The server takes the email from the ACCOUNT, never the body.
    opts: { ticket?: string } = {}
  ): Promise<{ ok: boolean; status: number; message?: string; code?: string }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('_hp', honeypot);
    if (opts.ticket) formData.append('ticket', opts.ticket);
    for (const [fieldId, file] of Object.entries(files)) {
      formData.append(fieldId, file);
    }

    const res = await fetch(`${BASE}/api/public/${slug}/submit`, {
      method: 'POST',
      body: formData,
      // No Content-Type — the browser sets it with the correct multipart boundary.
    });

    let message: string | undefined;
    let code: string | undefined;
    if (!res.ok) {
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message;
        code = body?.error?.code; // EMAIL_REQUIRED (422) / LOGIN_REQUIRED (401) — stable, mapped by the shell
      } catch {
        // non-JSON error body — ignore
      }
    }

    return { ok: res.ok, status: res.status, message, code };
  },
};
