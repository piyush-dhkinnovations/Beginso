import { isAxiosError } from 'axios';
import axiosInstance from '@/lib/axios';
import { unwrapEnvelope } from '@/lib/apiEnvelope';
import { workspaceHeaders } from '@/lib/workspaceHeaders';
import type { Note, NotePayload } from '@/types/note';

/**
 * Sprint 12 (inbox-collaboration), design.md §11.2, task 4.1. BE 0.3 is live —
 * `GET/POST /api/responses/:id/notes` · `PATCH/DELETE /api/responses/:id/notes/:noteId`. Unwrapped
 * defensively (`responses.ts`/`shared.ts`'s own established pattern) since the envelope key isn't
 * independently confirmed against a live payload from this checkout.
 */

// A mention of a member without access to this form is rejected 422 with a message that must not
// reveal whether that member exists (design.md §11.2's own explicit constraint) — mirrors
// `BulkBatchLimitError` in `services/responses.ts` so `NotesPanel`/`NoteComposer` can show this
// specific case without a blanket "failed to save" toast.
export class MentionAccessError extends Error {
  constructor() {
    super("One of the people you mentioned doesn't have access to this form.");
    this.name = 'MentionAccessError';
  }
}

function isMentionAccessError(err: unknown): boolean {
  return isAxiosError(err) && err.response?.status === 422;
}

export const notesService = {
  list: (responseId: string, scope?: string): Promise<Note[]> =>
    axiosInstance
      .get(`/api/responses/${responseId}/notes`, { headers: workspaceHeaders(scope) })
      .then((r) => {
        const notes = unwrapEnvelope<unknown>(r.data, 'notes');
        return Array.isArray(notes) ? (notes as Note[]) : [];
      }),

  create: (responseId: string, payload: NotePayload, scope?: string): Promise<Note> =>
    axiosInstance
      .post(`/api/responses/${responseId}/notes`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Note>(r.data, 'note'))
      .catch((err) => {
        if (isMentionAccessError(err)) throw new MentionAccessError();
        throw err;
      }),

  update: (responseId: string, noteId: string, payload: NotePayload, scope?: string): Promise<Note> =>
    axiosInstance
      .patch(`/api/responses/${responseId}/notes/${noteId}`, payload, { headers: workspaceHeaders(scope) })
      .then((r) => unwrapEnvelope<Note>(r.data, 'note'))
      .catch((err) => {
        if (isMentionAccessError(err)) throw new MentionAccessError();
        throw err;
      }),

  remove: (responseId: string, noteId: string, scope?: string): Promise<void> =>
    axiosInstance
      .delete(`/api/responses/${responseId}/notes/${noteId}`, { headers: workspaceHeaders(scope) })
      .then(() => undefined),
};
