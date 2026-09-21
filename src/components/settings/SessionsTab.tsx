'use client';

import { SessionsList } from './SessionsList';

// sprint-10 requirements.md §7.12 / design.md §15.4 — a relocation, not a rebuild: the list, revoke
// and current-device rules are SessionsList's own, unchanged since Sprint 6.
export function SessionsTab() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-heading-2 font-bold text-[var(--text-primary)]">Sessions &amp; Devices</h3>
      <SessionsList />
    </div>
  );
}
