'use client';

import { SessionsList } from './SessionsList';

// The list, revoke
// and current-device rules are SessionsList's own.
export function SessionsTab() {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="bg-h5 font-bold text-(--text-primary)">Sessions &amp; Devices</h3>
      <SessionsList />
    </div>
  );
}
