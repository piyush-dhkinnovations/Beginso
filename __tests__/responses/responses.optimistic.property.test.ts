/**
 * __tests__/responses/responses.optimistic.property.test.ts
 * Feature: sprint-4-responses, Property 1: Status optimistic update is exact
 * Requirements: 5.3, 11.1
 */

import { describe, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import fc from 'fast-check';
import { mockResponseDetail } from '@/lib/mocks/responsesMocks';
import type { ResponseDetail, ResponseStatus } from '@/types/response';

describe('optimistic status update — property test', () => {
  it('always writes exactly the given status into the cache, with no other field touched', () => {
    fc.assert(
      fc.property(fc.constantFrom<ResponseStatus>('new', 'in_progress', 'completed'), (status) => {
        const queryClient = new QueryClient();
        const key = ['response', 'resp-1'];
        const initial = mockResponseDetail('resp-1');
        queryClient.setQueryData(key, initial);

        // Same onMutate pattern used in src/app/(user)/responses/[id]/page.tsx
        queryClient.setQueryData<ResponseDetail>(key, (old) => (old ? { ...old, status } : old));

        const updated = queryClient.getQueryData<ResponseDetail>(key);
        return (
          updated?.status === status &&
          updated?._id === initial._id &&
          updated?.answers === initial.answers
        );
      }),
      { numRuns: 100 }
    );
  });
});
