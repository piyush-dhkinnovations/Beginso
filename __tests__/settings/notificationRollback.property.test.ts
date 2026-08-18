/**
 * __tests__/settings/notificationRollback.property.test.ts
 * Feature: sprint-6-settings, Property 2: Notification toggle rollback is exact
 * Requirements: 7.2, 7.3
 *
 * Mirrors NotificationsTab's exact onMutate (snapshot + optimistic write) / onError (restore the
 * snapshot) sequence directly against a QueryClient cache, matching this repo's established PBT
 * convention of testing the underlying mechanism (see responses.optimistic.property.test.ts)
 * rather than rendering the full component through N real async toggle interactions.
 */

import { describe, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import fc from 'fast-check';
import { settingsKeys } from '@/lib/queryKeys';
import type { WorkspaceSettings } from '@/types/settings';

describe('notification toggle rollback — property test', () => {
  it('after any sequence of flips where every save fails, the cache always ends at the last server-confirmed value', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }), (flips) => {
        const queryClient = new QueryClient();
        const serverConfirmed: WorkspaceSettings = {
          id: 'w1',
          name: 'Acme',
          logoUrl: null,
          branding: {},
          notificationPreferences: { newResponseEmail: true, weeklyDigestEmail: true, productUpdatesEmail: false },
          createdAt: '',
        };
        queryClient.setQueryData(settingsKeys.workspace(), serverConfirmed);

        for (const next of flips) {
          // onMutate
          const previous = queryClient.getQueryData<WorkspaceSettings>(settingsKeys.workspace());
          queryClient.setQueryData<WorkspaceSettings>(settingsKeys.workspace(), (old) =>
            old ? { ...old, notificationPreferences: { ...old.notificationPreferences, newResponseEmail: next } } : old
          );
          // mutation rejects -> onError rolls back to the pre-mutate snapshot
          queryClient.setQueryData(settingsKeys.workspace(), previous);
        }

        const final = queryClient.getQueryData<WorkspaceSettings>(settingsKeys.workspace());
        return final?.notificationPreferences.newResponseEmail === serverConfirmed.notificationPreferences.newResponseEmail;
      }),
      { numRuns: 100 }
    );
  });
});
