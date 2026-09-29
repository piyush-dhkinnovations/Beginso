/**
 * __tests__/lib/savedViewStaleness.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.6, task 2.6.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { staleFilterCount } from '@/lib/savedViewStaleness';
import type { StageRef } from '@/types/stage';
import type { Tag } from '@/types/tag';
import type { MemberListItem } from '@/types/team';

const STAGES: StageRef[] = [{ id: 's1', name: 'New', colour: 'info', category: 'new' }];
const TAGS: Tag[] = [{ id: 't1', name: 'Hot', colour: 'success' }];
const MEMBERS: MemberListItem[] = [
  { membershipId: 'm1', userId: 'u1', name: 'Priya', email: 'p@x.com', avatarUrl: null, role: 'admin', isOwner: false, lastActiveAt: null },
];

describe('staleFilterCount', () => {
  it('returns 0 for a view whose filters all still resolve', () => {
    expect(staleFilterCount({ stageId: 's1', tagIds: ['t1'], assigneeId: 'm1' }, STAGES, TAGS, MEMBERS)).toBe(0);
  });

  it('counts a deleted stage', () => {
    expect(staleFilterCount({ stageId: 'gone' }, STAGES, TAGS, MEMBERS)).toBe(1);
  });

  it('counts each deleted tag separately', () => {
    expect(staleFilterCount({ tagIds: ['t1', 'gone1', 'gone2'] }, STAGES, TAGS, MEMBERS)).toBe(2);
  });

  it('counts a deleted/removed assignee', () => {
    expect(staleFilterCount({ assigneeId: 'gone' }, STAGES, TAGS, MEMBERS)).toBe(1);
  });

  it('never counts the literal "unassigned"/"me" as stale', () => {
    expect(staleFilterCount({ assigneeId: 'unassigned' }, STAGES, TAGS, MEMBERS)).toBe(0);
    expect(staleFilterCount({ assigneeId: 'me' }, STAGES, TAGS, MEMBERS)).toBe(0);
  });

  it('never throws for an empty filter set', () => {
    expect(staleFilterCount({}, [], [], [])).toBe(0);
  });

  it('property: never negative, never throws, bounded by the number of filter fields set', () => {
    fc.assert(
      fc.property(
        fc.record(
          {
            stageId: fc.option(fc.string(), { nil: undefined }),
            tagIds: fc.option(fc.array(fc.string()), { nil: undefined }),
            assigneeId: fc.option(fc.string(), { nil: undefined }),
          },
          { requiredKeys: [] }
        ),
        (filters) => {
          const result = staleFilterCount(filters, STAGES, TAGS, MEMBERS);
          return result >= 0;
        }
      ),
      { numRuns: 200 }
    );
  });
});
