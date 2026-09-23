/**
 * __tests__/lib/noHardcodedColors.test.ts
 * sprint-11-v2a-hardening, requirements.md §7.4 (3.3)
 *
 * Reads an explicit array of V2a source files (not a glob over src/) and fails if any of them
 * contain a banned raw-palette class. Explicit, not a glob, so this test does not fail on the
 * accepted V2b gap (pre-V2 surfaces with no dark mode yet — builder, responses, templates,
 * analytics, reports, public form; see task 3.4's accepted-gap register in tasks.md).
 *
 * Files deliberately NOT in this list, and why:
 * - src/components/dashboard/{Sidebar,TopNav,DashboardShell,WelcomeSection}.tsx — dead code (3.1
 *   audit, Day 4): zero importers anywhere in src/, superseded by WorkspaceShell/PersonalShell
 *   (Sprint 8). Has raw classes; not fixed because nothing renders it (task 3.1's own instruction:
 *   "note the file is unused... delete nothing under this task").
 * - src/app/onboarding/layout.tsx — one deliberate `bg-neutral-50`, commented in the file itself
 *   as "Always a light surface, no dark variant" (onboarding renders before the caller has picked
 *   a theme). Not a dark-mode gap to close, a fixed design decision.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const BANNED = /bg-white|text-neutral-|bg-neutral-|border-neutral-|text-gray-|bg-gray-|text-black/;

// V2a screens per design.md §17, plus the shells/nav that wrap all of them. Live files only
// (checked against real importers, not the file list's own guesses) — see the header comment for
// what's excluded and why.
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
