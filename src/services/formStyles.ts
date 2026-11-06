import axiosInstance from '@/lib/axios';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import { snapshotStyle, type FormStyle } from '@/lib/formStyles';
import { cleanTheme } from '@/lib/formTheme';
import type { FormBranding, LayoutPreset } from '@/types/form';

// "My styles" (Save my style): GET / POST /api/form-styles, PATCH / DELETE /api/form-styles/:id. `scope` is a workspace slug or 'personal'.
// The reply is read defensively (bare list, { data } or { styles }), like the other services, and each style is rebuilt through snapshotStyle so
// anything unexpected in a stored branding is dropped before it reaches a form.

function toStyle(raw: unknown): FormStyle | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { _id?: unknown; id?: unknown; name?: unknown; layout?: unknown; branding?: unknown };
  const id = String(r._id ?? r.id ?? '');
  if (!id || typeof r.name !== 'string') return null;
  const branding = (r.branding && typeof r.branding === 'object' ? r.branding : {}) as FormBranding;
  const layout = (typeof r.layout === 'string' ? r.layout : 'classic') as LayoutPreset;
  const snap = snapshotStyle(layout, { ...branding, theme: cleanTheme(branding.theme) });
  return { id, name: r.name, ...snap };
}

function list(body: unknown): FormStyle[] {
  const raw = Array.isArray(body) ? body : ((body as { data?: unknown; styles?: unknown } | null)?.data ?? (body as { styles?: unknown } | null)?.styles);
  if (!Array.isArray(raw)) throw new Error('Unexpected /api/form-styles response shape');
  return raw.map(toStyle).filter((s): s is FormStyle => s !== null);
}

export const formStylesService = {
  list: (scope: string): Promise<FormStyle[]> => axiosInstance.get('/api/form-styles', { headers: workspaceHeaders(scope) }).then((r) => list(r.data)),

  save: (scope: string, payload: { name: string; layout: LayoutPreset; branding: FormBranding }): Promise<FormStyle> =>
    axiosInstance.post('/api/form-styles', payload, { headers: workspaceHeaders(scope) }).then((r) => {
      const style = toStyle((r.data as { data?: unknown } | undefined)?.data ?? r.data);
      if (!style) throw new Error('Unexpected POST /api/form-styles response shape');
      return style;
    }),

  rename: (scope: string, id: string, name: string): Promise<void> =>
    axiosInstance.patch(`/api/form-styles/${id}`, { name }, { headers: workspaceHeaders(scope) }).then(() => undefined),

  remove: (scope: string, id: string): Promise<void> => axiosInstance.delete(`/api/form-styles/${id}`, { headers: workspaceHeaders(scope) }).then(() => undefined),
};
