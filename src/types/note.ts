/**
 * Sprint 12 (inbox-collaboration), design.md §11.2 (Notes — confirmed live, BE 0.3).
 * `GET/POST /api/responses/:id/notes` · `PATCH/DELETE /api/responses/:id/notes/:noteId`.
 */

export interface NoteMention {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  authorId: string;
  authorName: string;
  /** Set when the author's membership has since been removed — name is kept, never blanked
   * (matches `ResponseAssignee.removed`'s own precedent). */
  authorRemoved?: boolean;
  body: string;
  mentions: NoteMention[];
  createdAt: string; // ISO 8601
  editedAt: string | null; // ISO 8601
}

/** POST/PATCH /api/responses/:id/notes[/:noteId] body. `mentionIds` are User ids (same convention
 * as `assigneeId`), collected from the picker's selections — never parsed from `body` text. */
export interface NotePayload {
  body: string;
  mentionIds?: string[];
}
