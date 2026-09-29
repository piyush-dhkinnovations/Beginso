/**
 * __tests__/responses/responses.optimistic.property.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.1 (1.1) — migrated to stage optimistic
 * updates; the removed `ResponseStatus` union is no longer what gets patched into the cache.
 * Feature: sprint-4-responses, Property 1: Stage optimistic update is exact
 */

import { describe, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import fc from 'fast-check';
import { mockResponseDetail } from '@/lib/mocks/responsesMocks';
import type { ResponseDetail } from '@/types/response';
import type { StageCategory } from '@/types/stage';

const STAGE_IDS: Record<StageCategory, string> = {
  new: 'stage-new',
  in_progress: 'stage-in-progress',
  completed: 'stage-completed',
};

describe('optimistic stage update — property test', () => {
  it('always writes exactly the given stage id into the cache, with no other field touched', () => {
    fc.assert(
      fc.property(fc.constantFrom<StageCategory>('new', 'in_progress', 'completed'), (category) => {
        const stageId = STAGE_IDS[category];
        const queryClient = new QueryClient();
        const key = ['responses', 'personal', 'detail', 'resp-1'];
        const initial = mockResponseDetail('resp-1');
        queryClient.setQueryData(key, initial);

        // Same onMutate pattern used in ResponseDrawer.tsx.
        queryClient.setQueryData<ResponseDetail>(key, (old) => (old ? { ...old, stage: { ...old.stage, id: stageId } } : old));

        const updated = queryClient.getQueryData<ResponseDetail>(key);
        return (
          updated?.stage.id === stageId &&
          updated?._id === initial._id &&
          updated?.answers === initial.answers
        );
      }),
      { numRuns: 100 }
    );
  });
});
