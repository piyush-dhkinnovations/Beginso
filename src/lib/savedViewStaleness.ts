import type { ResponseFilters } from '@/types/response';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';

/**
 * Sprint 12 (inbox-collaboration), requirements.md §7.6: "A saved view referencing a deleted
 * stage/tag/member renders the remaining filters and shows an inline notice ... it never errors."
 * Pure so it's trivial to test directly (`__tests__/lib/savedViewStaleness.test.ts`) without
 * mounting `SavedViewSelect`. `'unassigned'`/`'me'` are always valid (server-resolved literals,
 * design.md §11.2), never counted as stale.
 */
export function staleFilterCount(
  filters: ResponseFilters,
  stages: readonly StageRef[],
  tags: readonly Tag[],
  members: readonly MemberListItem[]
): number {
  let count = 0;
  if (filters.stageId && !stages.some((s) => s.id === filters.stageId)) count += 1;
  if (filters.tagIds) count += filters.tagIds.filter((id) => !tags.some((t) => t.id === id)).length;
  if (
    filters.assigneeId &&
    filters.assigneeId !== 'unassigned' &&
    filters.assigneeId !== 'me' &&
    !members.some((m) => m.membershipId === filters.assigneeId)
  ) {
    count += 1;
  }
  return count;
}
