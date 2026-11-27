/**
 * Reads an explicit array of source files (not a glob over src/) and fails if any of them
 * contain a banned raw-palette class.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const BANNED = /bg-white|text-neutral-|bg-neutral-|border-neutral-|text-gray-|bg-gray-|text-black/;

// Screens, plus the shells/nav that wrap all of them. Live files only
// (checked against real importers, not the file list's own guesses).
const V2A_FILES = [
  'src/components/dashboard/NotificationBell.tsx',
  'src/components/dashboard/UserProfileDropdown.tsx',
  'src/components/ui/TopBar.tsx',
  'src/app/(auth)/reset-password/page.tsx',
  'src/app/(auth)/verification-code/page.tsx',
  'src/app/(auth)/verify-email/page.tsx',
  'src/app/(auth)/forgot-password/page.tsx',
  'src/components/workspaces/PersonalShell.tsx',
  'src/components/workspaces/WorkspaceShell.tsx',
  'src/components/workspaces/PersonalSidebar.tsx',
  'src/components/workspaces/WorkspaceSidebar.tsx',
  'src/components/workspaces/WorkspaceContextSwitcher.tsx',
  'src/components/settings/WorkspaceTab.tsx',
  'src/components/settings/BrandingTab.tsx',
  'src/components/settings/NotificationsTab.tsx',
  'src/components/team/AuditTable.tsx',
  'src/components/team/RolesMatrix.tsx',
  'src/components/team/MemberTable.tsx',
  'src/components/team/PendingInvitesTable.tsx',
  'src/components/team/InviteMembersModal.tsx',
  'src/components/team/FormAccessPanel.tsx',
  'src/components/team/AuditFilters.tsx',
  'src/components/forms/BulkActionBar.tsx',
  'src/app/(user)/forms/page.tsx',
  'src/app/w/[slug]/team/page.tsx',
  'src/app/w/[slug]/audit/page.tsx',
  'src/app/w/[slug]/roles/page.tsx',
  'src/app/w/[slug]/activity/page.tsx',
  'src/app/w/[slug]/page.tsx',
  'src/app/(user)/settings/page.tsx',
  'src/app/(user)/workspaces/page.tsx',
  'src/app/(user)/shared/page.tsx',
  'src/app/(user)/dashboard/page.tsx',
  'src/app/invite/[token]/page.tsx',
];

describe('V2a source files have no raw palette class', () => {
  it.each(V2A_FILES)('%s', (relativePath) => {
    const source = readFileSync(join(__dirname, '../..', relativePath), 'utf-8');
    expect(source).not.toMatch(BANNED);
  });
});
