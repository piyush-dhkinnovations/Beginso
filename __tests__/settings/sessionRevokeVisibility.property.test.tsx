/**
 * __tests__/settings/sessionRevokeVisibility.property.test.tsx
 * Feature: sprint-6-settings, Property 5: Session list never renders the current session with a
 * working Revoke action
 * Requirements: 9.2
 *
 * SessionRow always renders the Revoke button (so every row reserves the same height — see its
 * own comment), hiding it for the current session via `invisible` + `tabIndex={-1}` rather than
 * omitting it from the DOM. This property checks the observable, screen-reader/keyboard-relevant
 * invariant — non-interactive (`tabIndex="-1"`) exactly on the current session's row — not raw DOM
 * presence, since presence alone no longer distinguishes the two states after that change.
 */

import { describe, it } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { SessionRow } from '@/components/settings/SessionRow';
import type { SessionSummary } from '@/types/settings';

describe('SessionRow revoke visibility — property test', () => {
  it('the current session\'s Revoke control is always non-interactive; every other session\'s is real', () => {
    fc.assert(
      fc.property(
        fc
          .array(fc.record({ id: fc.uuid(), isCurrent: fc.boolean() }), { minLength: 1, maxLength: 10 })
          .filter((sessions) => sessions.filter((s) => s.isCurrent).length === 1),
        (sessions) =>
          sessions.every((s) => {
            const session: SessionSummary = {
              id: s.id,
              deviceLabel: 'Chrome on Windows',
              approxLocation: null,
              lastActiveAt: '2026-08-17T08:30:00.000Z',
              isCurrent: s.isCurrent,
            };
            const { container, unmount } = render(<SessionRow session={session} onRevoke={() => {}} isRevoking={false} />);
            const button = container.querySelector('button');
            const isNonInteractive = button?.getAttribute('tabIndex') === '-1';
            unmount();
            return isNonInteractive === s.isCurrent;
          })
      ),
      { numRuns: 100 }
    );
  });
});
