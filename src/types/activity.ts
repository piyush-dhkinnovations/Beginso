/**
 * Sprint 12 (inbox-collaboration), design.md §11.2 (confirmed live, BE 0.3).
 * `GET /api/responses/:id/activity` — oldest first (per Day 4's brief; design.md's own §11.2 line
 * says "newest last", same ordering stated two ways).
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
}
