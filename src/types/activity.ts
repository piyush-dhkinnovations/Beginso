/**
 * Sprint 12 (inbox-collaboration), design.md §11.2 (confirmed live, BE 0.3).
 * `GET /api/responses/:id/activity` — newest first (changed Sprint 12 close-out: a reviewer
 * opening the sidebar wants the most recent activity without scrolling, overriding the original
 * "oldest first" call).
 */

export type ActivityType =
  | 'submitted'
  | 'opened'
  | 'stage_changed'
  | 'status_change'
  | 'assigned'
  | 'unassigned'
  | 'tag_added'
  | 'tag_removed'
  | 'note_added'
  | 'scored'
  | (string & {});

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  actorName: string;
  /** Set when the actor's membership has since been removed — name kept, never blanked. */
  actorRemoved?: boolean;
  at: string; // ISO 8601
  detail?: string;
  /** stage_changed only. Not sent by the backend yet (it stores both ids but returns neither). */
  fromStageId?: string;
  toStageId?: string;
}
