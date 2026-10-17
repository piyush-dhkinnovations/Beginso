import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import type {
  Form,
  FormOverviewStats,
  CreateFormPayload,
  UpdateFormPayload,
  Readiness,
  PublishBody,
  PublishResult,
  TestSubmissionAnswer,
} from '@/types/form';
import type { FormDestination, FormsContext } from '@/types/workspace';
export type FormsSortField = 'title' | 'status' | 'updatedAt' | 'createdAt';

// PATCH /api/forms/:id validates branding/settings strictly (zod `.optional()` rejects `null`, an empty
// string where a hex is required, and out-of-enum values). Workspace default branding copied onto a new
// form, and older stored forms, carry exactly those - the cause of the 400 right after create. Strip
// them here so every save path (create follow-up, autosave, publish flush) sends a valid body.
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const BRANDING_ENUMS: Record<string, readonly string[]> = {
  buttonStyle: ['solid', 'outline'],
  buttonRadius: ['4px', '8px', '16px'],
  coverPosition: ['center', 'top', 'bottom'],
  spacing: ['compact', 'comfortable', 'spacious'],
  fontFamily: ['dm_sans', 'inter', 'work_sans', 'lora', 'nunito'],
  typeScale: ['compact', 'default', 'large'],
  cardStyle: ['flat', 'soft', 'bordered', 'elevated'],
  panelTreatment: ['solid', 'gradient', 'image', 'pattern'],
  fieldGrouping: ['auto', 'single'],
  formWidth: ['narrow', 'standard', 'wide'],
  coverFit: ['banner', 'original'],
  backgroundStyle: ['wash', 'plain', 'solid', 'gradient', 'mesh', 'dots', 'grid', 'image'],
};
const BRANDING_STRINGS = ['logoUrl', 'coverImageUrl', 'backgroundImageUrl'];

export function sanitizeBranding(raw: Record<string, unknown> | undefined | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw) return out;
  if (typeof raw.primaryColor === 'string' && HEX_RE.test(raw.primaryColor.trim())) out.primaryColor = raw.primaryColor.trim();
  if (typeof raw.backgroundColor === 'string' && HEX_RE.test(raw.backgroundColor.trim())) out.backgroundColor = raw.backgroundColor.trim();
  if (typeof raw.iconName === 'string' && /^[a-z0-9-]{2,40}$/.test(raw.iconName)) out.iconName = raw.iconName;
  for (const k of BRANDING_STRINGS) if (typeof raw[k] === 'string' && (raw[k] as string).trim()) out[k] = raw[k];
  for (const [k, allowed] of Object.entries(BRANDING_ENUMS)) if (typeof raw[k] === 'string' && allowed.includes(raw[k] as string)) out[k] = raw[k];
  if (typeof raw.showProgress === 'boolean') out.showProgress = raw.showProgress;
  return out;
}

function dropNulls<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null)) as T;
}

export const formsService = {
  createForm: (payload: CreateFormPayload) =>
    axiosInstance.post<{ _id: string; title: string }>('/api/forms', payload).then(r => r.data),

  moveForm: (formId: string, destination: FormDestination) =>
    axiosInstance
      .post<Form>(`/api/forms/${formId}/move`, {
        targetWorkspaceId: destination.type === 'workspace' ? destination.workspaceId : 'personal',
      })
      .then((r) => r.data),

  // Real bug found and fixed: this never told the backend which context (personal vs. which
  // workspace) it was asking for, so `GET /api/forms` always fell through to
  // `requirePermission()`'s workspace-resolution step 4 — "caller's default `user.workspaceId`"
  // (API_CONTRACT.md's "Workspace Resolution" order) — every context showed the exact same list.
  // A form created in a workspace then appeared in Personal space too, and switching workspaces
  // never changed what loaded. Fixed by sending step 1's `x-workspace-slug` header for workspace
  // context (the only resolution mechanism the contract confirms accepts a slug, not an ObjectId
  // — `context.workspaceId` here is literally the URL slug, not a Mongo `_id`).
  //
  // Second layer of this same bug, found a day later: the header approach above was correct but
  // a no-op — our own BFF (`src/app/api/backend/[...path]/route.ts`) rebuilt the upstream request
  // headers from a fixed whitelist and silently dropped `x-workspace-slug` before it ever reached
  // the real backend. Fixed there; this file needed no further change once that was forwarded.
  //
  // Personal context is the less-confirmed half: nothing in the documented resolution order
  // describes an explicit "ignore my default workspace" override for a GET. `workspaceId=personal`
  // is sent as a best-effort query param, matching the `null`/`'personal'` convention this same
  // backend already uses on `/forms/:id/move` and form creation — not directly confirmed for this
  // endpoint. If a caller's default workspace still leaks into personal listings after this,
  // that confirms the override needs backend support, not a different frontend guess.
  getForms: (
    // `archived` (Sprint 13, CF5.6): 'false' (default) hides archived forms, 'only' shows just them.
    params?: { search?: string; status?: string; page?: number; limit?: number; archived?: 'true' | 'false' | 'only'; pinned?: boolean; sort?: FormsSortField; order?: 'asc' | 'desc' },
    context?: FormsContext
  ) =>
    axiosInstance
      .get<{ forms: Form[]; total: number; page: number; limit: number }>('/api/forms', {
        params: {
          ...params,
          ...(context?.type === 'personal' ? { workspaceId: 'personal' } : {}),
        },
        headers: context?.type === 'workspace' ? { 'x-workspace-slug': context.workspaceId } : context?.type === 'personal' ? workspaceHeaders('personal') : undefined,
      })
      .then((res) => {
        // Pinning is per-user; the backend sends `pinned` on every row, but never trust a missing flag.
        const r = {
          ...res,
          data: {
            ...res.data,
            forms: (res.data?.forms ?? []).map((f) => ({ ...f, pinned: f.pinned === true, pinnedAt: f.pinned === true ? f.pinnedAt ?? null : null })),
          },
        };
        // Defence kept: backend honours the explicit 'personal' header (requirePermission -> explicitPersonalContext), but this filter stays as a cheap safety net.
        // Real bug found and fixed: the comment above already flagged this as unconfirmed — now
        // confirmed live. A brand-new user whose "default workspace" (the backend's own
        // resolution-order fallback) is the workspace they just joined via invite accept sees
        // that workspace's forms leak into their *personal* space list — `workspaceId=personal`
        // isn't honored server-side for this case. Filtered here as a client-side safety net
        // (never trust the backend's own scoping without checking, this session's own
        // established pattern) so Personal space can never show a workspace-owned form
        // regardless of what the backend's query actually returned.
        if (context?.type !== 'personal') return r.data;
        const forms = r.data.forms.filter((form) => form.workspaceId === null);
        const filteredOut = r.data.forms.length - forms.length;
        return filteredOut === 0
          ? r.data
          : { ...r.data, forms, total: Math.max(0, r.data.total - filteredOut) };
      }),

  // The backend caps `limit` at 50 (silently), so "all forms" for stats/pickers means paging.
  // ponytail: capped at MAX_PAGES (2 000 forms) so a runaway workspace cannot fire unbounded requests.
  getAllForms: async (context?: FormsContext, params?: { status?: string }) => {
    const PAGE = 50;
    const first = await formsService.getForms({ ...params, page: 1, limit: PAGE }, context);
    const pages = Math.min(Math.ceil(first.total / PAGE), 40);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) => formsService.getForms({ ...params, page: i + 2, limit: PAGE }, context)),
    );
    return { ...first, forms: [first, ...rest].flatMap((r) => r.forms), limit: PAGE };
  },

  getFormById: (id: string) =>
    axiosInstance.get<Form>(`/api/forms/${id}`).then(r => r.data),

  // Real bug found and fixed (22 Sep 2026): this was written against "extend GET /api/forms/:id"
  // (tasks.md 2.2's stated smaller diff) because no live example existed yet — confirmed live
  // today that the backend instead built a genuinely separate `GET /api/forms/:id/overview`
  // route, `{ success, overview: { formId, title, description, status, workspaceId,
  // responseCount, responseCountThisWeek, completionRate, createdAt, updatedAt } }`. The base
  // `GET /api/forms/:id` was never extended with stats at all — calling only it, as this used to,
  // meant every stat silently degraded to its null/0 fallback forever, never actually reading a
  // real number. That slim `overview` object is also missing `slug` (needed for the public share
  // link) and the builder-only fields (`fields`/`pages`/`branding`/`settings`) this page doesn't
  // need — so this still calls the base route too, for the parts only it has, rather than
  // pretend the new endpoint is a full replacement.
  getFormOverview: (id: string): Promise<{ form: Form; stats: FormOverviewStats }> =>
    Promise.all([
      axiosInstance.get(`/api/forms/${id}`).then((r) => unwrapEnvelope<Form>(r.data, 'form')),
      axiosInstance
        .get(`/api/forms/${id}/overview`)
        .then((r) => unwrapEnvelope<Partial<FormOverviewStats>>(r.data, 'overview'))
        .catch(() => ({}) as Partial<FormOverviewStats>),
    ]).then(([form, stats]) => ({
      form,
      stats: {
        responseCount: stats.responseCount ?? form.responseCount ?? 0,
        responseCountThisWeek: stats.responseCountThisWeek ?? null,
        completionRate: stats.completionRate ?? null,
      },
    })),

  updateForm: (id: string, payload: UpdateFormPayload, opts: { keepalive?: boolean } = {}) =>
    axiosInstance
      .patch<Form>(`/api/forms/${id}`, {
        ...payload,
        // `pages: []` is rejected (min 1) - a just-created form has none until the builder seeds one.
        ...(payload.pages && payload.pages.length === 0 ? { pages: undefined } : {}),
        ...(payload.branding ? { branding: sanitizeBranding(payload.branding as Record<string, unknown>) } : {}),
        ...(payload.settings ? { settings: dropNulls(payload.settings) } : {}),
      }, opts.keepalive ? { adapter: 'fetch', fetchOptions: { keepalive: true } } : undefined)
      .then((r) => r.data),

  // Sprint 13 (CF5.5) — BREAKING on the backend: this now moves the form to Trash (200 with `purgeAt`) instead
  // of destroying it. Callers still only care that it worked; the result is the countdown for the toast.
  deleteForm: (id: string) =>
    axiosInstance
      .delete<{ deletedAt?: string; purgeAt?: string }>(`/api/forms/${id}`)
      .then((r) => ({ deletedAt: r.data?.deletedAt, purgeAt: r.data?.purgeAt })),

  duplicateForm: (id: string) =>
    axiosInstance.post<{ _id: string; title: string }>(`/api/forms/${id}/duplicate`).then(r => r.data),

  // Sprint 13 (CF6.5): optional body commits the pre-flight's access mode / closing date with the publish.
  // The slug is REUSED on re-publish (CF5.3) — `slug` here is always the link that is live now.
  publishForm: (id: string, body?: PublishBody): Promise<PublishResult> =>
    axiosInstance
      .post<PublishResult & { publishedSlug?: string }>(`/api/forms/${id}/publish`, body ?? {})
      .then((r) => ({ ...r.data, slug: r.data.publishedSlug ?? r.data.slug ?? '' })),

  // Sprint 13 (CF2.5): the ONE readiness evaluation, shared with the server's own publish check.
  getReadiness: (id: string): Promise<Readiness> =>
    axiosInstance.get(`/api/forms/${id}/readiness`).then((r) => {
      const body = (r.data ?? {}) as Partial<Readiness>;
      const blocking = Array.isArray(body.blocking) ? body.blocking : [];
      return {
        ready: typeof body.ready === 'boolean' ? body.ready : blocking.length === 0,
        blocking,
        warnings: Array.isArray(body.warnings) ? body.warnings : [],
      };
    }),

  // Back to draft, KEEPING the public link. Undo is simply publishForm again.
  unpublishForm: (id: string) =>
    axiosInstance
      .post<{ _id: string; status: 'draft'; slug?: string; publishedSlug?: string }>(`/api/forms/${id}/unpublish`)
      .then((r) => r.data),

  // The one deliberate way to replace a public link; the old one stops working at once.
  regenerateLink: (id: string) =>
    axiosInstance
      .post<{ _id: string; slug: string; publishedSlug?: string; previousSlugInvalidated?: boolean }>(
        `/api/forms/${id}/regenerate-link`
      )
      .then((r) => ({ ...r.data, slug: r.data.publishedSlug ?? r.data.slug ?? '' })),

  archiveForm: (id: string) =>
    axiosInstance.post<{ _id: string; archivedAt: string }>(`/api/forms/${id}/archive`).then((r) => r.data),

  unarchiveForm: (id: string) =>
    axiosInstance.post<{ _id: string; archivedAt: null }>(`/api/forms/${id}/unarchive`).then((r) => r.data),

  // Sprint 13 (CF2.6): a real submission through the real pipeline, flagged `isTest` — it counts nowhere.
  sendTestSubmission: (id: string, answers: TestSubmissionAnswer[]) =>
    axiosInstance.post<{ _id: string; isTest: true }>(`/api/forms/${id}/test-submissions`, { answers }).then((r) => r.data),

  // Pins are per-user private bookmarks; both calls are idempotent. Errors carry the backend code
  // (PIN_LIMIT 400, 409 archived/trashed) for usePinForm to turn into a message.
  pinForm: (id: string) =>
    axiosInstance.put(`/api/forms/${id}/pin`).then((r) => unwrapEnvelope<{ pinned?: boolean; pinnedAt?: string }>(r.data, 'data')),

  unpinForm: (id: string) => axiosInstance.delete(`/api/forms/${id}/pin`).then(() => undefined),

  closeForm: (id: string) =>
    axiosInstance.post<{ _id: string; status: 'closed' }>(`/api/forms/${id}/close`).then(r => r.data),
};

