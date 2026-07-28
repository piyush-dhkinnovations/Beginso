/**
 * GET /api/public/:slug and POST /api/public/:slug/submit.
 * fetch() only — no Axios, no auth headers, no cookies.
 */

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
   * Sends multipart/form-data: `data` (JSON), `_hp` (honeypot), one part per file field.
   * `honeypot` defaults to '' for real respondents — passed through as-is (not hardcoded)
   * so a bot that actually fills the hidden `_hp` input is still reported to the backend.
   */
  async submitForm(
    slug: string,
    data: SubmissionData,
    files: Record<string, File>,
    honeypot: string = ''
  ): Promise<{ ok: boolean; status: number; message?: string }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('_hp', honeypot);
    for (const [fieldId, file] of Object.entries(files)) {
      formData.append(fieldId, file);
    }

    const res = await fetch(`${BASE}/api/public/${slug}/submit`, {
      method: 'POST',
      body: formData,
      // No Content-Type — the browser sets it with the correct multipart boundary.
    });

    let message: string | undefined;
    if (!res.ok) {
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message;
      } catch {
        // non-JSON error body — ignore
      }
    }

    return { ok: res.ok, status: res.status, message };
  },
};
