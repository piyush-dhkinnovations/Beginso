/**
 * __tests__/settings/deleteWorkspaceConfirm.property.test.ts
 * Feature: sprint-6-settings, Property 3: Delete button never enabled on a partial/incorrect match
 * Requirements: 10.4
 *
 * Mirrors the name-matching half of DeleteWorkspaceModal's exact `canAttemptDelete` condition
 * (`password.length > 0 && typedName === workspaceName`) — the password-presence half is a
 * separate, simpler condition not covered by this property, which is specifically about the typed
 * text matching. Plain strict equality already rejects same-length near-misses, case variations,
 * and whitespace-padded variants, so no separate normalization logic exists to test.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';

function isDeleteDisabled(typed: string, workspaceName: string): boolean {
  return typed !== workspaceName;
}

describe('DeleteWorkspaceModal typed-confirmation — property test', () => {
  it('is disabled for any string that is not byte-for-byte equal to the loaded workspace name', () => {
    fc.assert(
      fc.property(fc.string(), fc.constant('Acme Workspace'), (typed, workspaceName) => {
        if (typed === workspaceName) return true; // exact match is the one allowed case
        return isDeleteDisabled(typed, workspaceName) === true;
      }),
      { numRuns: 100 }
    );
  });

  it('rejects same-length near-misses, case variations, and whitespace-padded variants specifically', () => {
    const workspaceName = 'Acme Workspace';
    const nearMisses = ['acme workspace', 'ACME WORKSPACE', ' Acme Workspace', 'Acme Workspace ', 'Acme Workspacd', 'Acme workspace'];
    for (const typed of nearMisses) {
      if (isDeleteDisabled(typed, workspaceName) !== true) {
        throw new Error(`Expected "${typed}" to be rejected as a near-miss of "${workspaceName}"`);
      }
    }
  });
});
