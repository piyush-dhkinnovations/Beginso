import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { ActivityEntry } from '@/types/activity';

// Sprint 12 (inbox-collaboration), design.md §11.2, task 4.1. BE 0.3 is live —
// GET /api/responses/:id/activity. Unwrapped defensively, same precedent as notes.ts.
export const activityService = {
  list: (responseId: string, scope?: string): Promise<ActivityEntry[]> =>
    axiosInstance
      .get(`/api/responses/${responseId}/activity`, { headers: workspaceHeaders(scope) })
      .then((r) => {
        const entries = unwrapEnvelope<unknown>(r.data, 'activity');
        return Array.isArray(entries) ? (entries as ActivityEntry[]) : [];
      }),
};
