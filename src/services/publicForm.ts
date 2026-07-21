/**
 * GET /api/public/:slug and POST /api/public/:slug/submit.
 * fetch() only — no Axios, no auth headers, no cookies.
 */

import type { PublicFormSchema, SubmissionData } from '@/types/publicForm';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const publicFormService = {
  /** Returns null on 404 (draft/closed/not found). Throws on other non-ok status or network error. */
  async getFormSchema(slug: string): Promise<PublicFormSchema | null> {
    const res = await fetch(`${BASE}/api/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load form: ${res.status}`);
    return res.json() as Promise<PublicFormSchema>;
  },

  /** Sends multipart/form-data: `data` (JSON), `_hp` (honeypot, always empty), one part per file field. */
  async submitForm(
    slug: string,
    data: SubmissionData,
    files: Record<string, File>
  ): Promise<{ ok: boolean; status: number; message?: string }> {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('_hp', '');
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
