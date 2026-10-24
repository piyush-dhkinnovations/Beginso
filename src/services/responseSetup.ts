import axiosInstance from '@/lib/axios';
import { DEFAULT_RESPONSE_SETUP, type ResponseSetup, type SaveResponseSetupInput } from '@/types/responseSetup';

/**
 * GET / PUT /api/forms/:formId/response-setup (backend: responseSetup.controller.ts). The envelope is read defensively like the other
 * services: whatever the server leaves out falls back to the default, so a half-filled answer never breaks the Responses page.
 */
function toSetup(raw: unknown): ResponseSetup {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ResponseSetup>;
  const stages = r.stages;
  return {
    version: typeof r.version === 'number' ? r.version : 0,
    setup: { ...DEFAULT_RESPONSE_SETUP, ...(r.setup ?? {}) },
    stages: {
      mode: stages?.mode === 'own' ? 'own' : 'workspace',
      list: Array.isArray(stages?.list) ? stages.list : [],
      startIndex: typeof stages?.startIndex === 'number' ? stages.startIndex : null,
    },
  };
}

export const responseSetupService = {
  get: (formId: string): Promise<ResponseSetup> => axiosInstance.get(`/api/forms/${formId}/response-setup`).then((r) => toSetup(r.data)),

  save: (formId: string, input: SaveResponseSetupInput): Promise<ResponseSetup> =>
    axiosInstance.put(`/api/forms/${formId}/response-setup`, input).then((r) => toSetup(r.data)),
};
