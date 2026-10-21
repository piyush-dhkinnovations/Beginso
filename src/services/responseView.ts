import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import { DEFAULT_VIEW } from '@/lib/responseView';
import type { FormResponseViewDefault, PersonalResponseView, ResponseViewConfig, ResponseViewSettings } from '@/types/responseView';

// Sprint 15 (response layouts). Hiding or pinning a question in a view is cosmetic: exports and downloads still include it.
// The envelope is unwrapped defensively, like every service here: the backend has been inconsistent about wrapping.
export const responseViewService = {
  get: (formId: string, scope?: string): Promise<ResponseViewConfig> =>
    axiosInstance.get(`/api/forms/${formId}/response-view`, { headers: workspaceHeaders(scope) }).then((r) => {
      const raw = (r.data ?? {}) as Partial<ResponseViewConfig>;
      return {
        resolved: raw.resolved ?? { ...DEFAULT_VIEW, source: 'system' },
        formDefault: raw.formDefault ?? null,
        personal: raw.personal ?? null,
        personalAll: raw.personalAll ?? null,
      };
    }),

  /** scope: 'all' (every form) or one formId. */
  savePersonal: (scope: string, settings: ResponseViewSettings, workspace?: string): Promise<PersonalResponseView | null> =>
    axiosInstance
      .put('/api/me/response-view', { scope, ...settings }, { headers: workspaceHeaders(workspace) })
      .then((r) => unwrapEnvelope<PersonalResponseView | null>(r.data, 'personal')),

  clearPersonal: (scope: string, workspace?: string): Promise<void> =>
    axiosInstance.delete('/api/me/response-view', { params: { scope }, headers: workspaceHeaders(workspace) }).then(() => undefined),

  /** expectedVersion: the version last seen, or 0 when the form has no default yet. A 409 means someone else changed it. */
  saveFormDefault: (formId: string, settings: ResponseViewSettings, expectedVersion: number, scope?: string): Promise<FormResponseViewDefault> =>
    axiosInstance
      .put(`/api/forms/${formId}/response-view-default`, { expectedVersion, ...settings }, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<FormResponseViewDefault>(r.data, 'formDefault')),
};
