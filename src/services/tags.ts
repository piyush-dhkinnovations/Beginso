import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { Tag, TagPayload } from '@/types/tag';

/**
 * BE 0.2 — not yet built (design.md §11.2). Built against the documented contract; field names
 * are a proposal ("Backend contract to confirm"). Envelope unwrapped defensively per design.md
 * §12, same as `stagesService`.
 */
export const tagsService = {
  list: (scope: string): Promise<Tag[]> =>
    axiosInstance
      .get(`/api/workspaces/${scope}/tags`, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Tag[]>(r.data, 'tags'))
      .then((tags) => (Array.isArray(tags) ? tags : [])),

  create: (scope: string, payload: TagPayload): Promise<Tag> =>
    axiosInstance
      .post(`/api/workspaces/${scope}/tags`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Tag>(r.data, 'tag')),

  update: (scope: string, tagId: string, payload: Partial<TagPayload>): Promise<Tag> =>
    axiosInstance
      .patch(`/api/workspaces/${scope}/tags/${tagId}`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Tag>(r.data, 'tag')),

  remove: (scope: string, tagId: string): Promise<void> =>
    axiosInstance.delete(`/api/workspaces/${scope}/tags/${tagId}`, { headers: workspaceHeaders(scope) }).then(() => undefined),

  // Atomic merge (source -> target), design.md §11.2.
  merge: (scope: string, tagId: string, into: string): Promise<void> =>
    axiosInstance
      .post(`/api/workspaces/${scope}/tags/${tagId}/merge`, { into }, { headers: workspaceHeaders(scope) })
      .then(() => undefined),
};
