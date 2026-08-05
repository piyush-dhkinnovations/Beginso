import type { GetResponsesParams } from '@/types/response';

export const responseKeys = {
  all: (formId: string) => ['responses', formId] as const,
  list: (formId: string, params: Partial<Omit<GetResponsesParams, 'formId'>>) =>
    ['responses', formId, params] as const,
  detail: (id: string) => ['response', id] as const,
};
