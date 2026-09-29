/**
 * __tests__/qa/roleMatrix.expected.ts
 * sprint-11-v2a-hardening, requirements.md §7.2 (2.1)
 *
 * The hand-written expected cross-role table. Written from the wireframe's roles screen
 * (16. Roles & Permissions, rolesContent()) and this spec's own requirements — deliberately never
 * derived from src/lib/roles.ts's CAPABILITIES/canManageMembers/canViewAudit/canViewTemplates, so
 * this test fails the moment the matrix file and the wireframe drift apart instead of trivially
 * agreeing with whatever the implementation already does.
 *
 * Scope today (Day 2 / Tuesday, task 2.2): navigation and shells only — WorkspaceSidebar and
 * PersonalSidebar. Pages/actions (2.3) and the per-form grant context are carried to the next
 * pass; this file's `Ctx`/`ExpectedCell` shape (design.md §13) already anticipates them.
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type Ctx = 'personal' | 'workspace' | 'form-grant';

export interface ExpectedCell {
  role: Role | 'grant-read' | 'grant-write';
  ctx: Ctx;
  screen: string;
  visible: string[];
  hidden: string[];
  /** true when the whole screen/shell is denied outright for this cell, not just some controls */
  denied?: boolean;
}

// ── Workspace shell nav (WorkspaceSidebar) ─────────────────────────────────────────────────────
// Wireframe: appSidebar()/setRole() (Beginso-Design-System .../wireframes/index.html:596-700).
// Home/Forms/Activity are visible to every role — Activity is explicitly not manager-only
// (sprint-10 requirements.md §7.6, "seeing what happened in a workspace you belong to is not
// manager-only"). Team and Audit Log are owner/admin only (§7.7). Templates has no entry in this
// shell at all for any role — the wireframe's "Reviewer: no Templates" rule is trivially true here
// because nobody sees it in a workspace context, not a per-role distinction worth asserting.
// Sprint 12 (inbox-collaboration), task 1.9 — 'Inbox' added in the same PR as
// src/app/w/[slug]/inbox/page.tsx (WorkspaceSidebar's own "never before" rule). Visible to every
// role, same as Activity — collaboration signals are not manager-only.
const WORKSPACE_NAV_BASE = ['Home', 'Forms', 'Inbox', 'Activity'];

export const WORKSPACE_NAV_MATRIX: ExpectedCell[] = [
  {
    role: 'owner',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: [...WORKSPACE_NAV_BASE, 'Team', 'Audit Log'],
    hidden: [],
  },
  {
    role: 'admin',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: [...WORKSPACE_NAV_BASE, 'Team', 'Audit Log'],
    hidden: [],
  },
  {
    role: 'member',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: WORKSPACE_NAV_BASE,
    hidden: ['Team', 'Audit Log'],
  },
  {
    role: 'viewer',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: WORKSPACE_NAV_BASE,
    hidden: ['Team', 'Audit Log'],
  },
];

// ── Personal shell nav (PersonalSidebar) ───────────────────────────────────────────────────────
// Role is not meaningful in personal context (the caller owns everything) — one cell, owner by
// convention (design.md §13's "{owner} × {personal}"). Responses/Analytics/Reports are asserted
// only in the "caller has forms" state; their separate empty-account hiding behaviour is already
// covered by PersonalSidebar.test.tsx and is not re-tested here (task 1.7's "do not add tests for
// behaviour that does not exist" applies symmetrically to "does not need re-testing here").
export const PERSONAL_NAV_MATRIX: ExpectedCell[] = [
  {
    role: 'owner',
    ctx: 'personal',
    screen: 'PersonalSidebar',
    visible: ['Home', 'My Forms', 'Shared with me', 'Templates', 'Responses', 'Analytics', 'Reports', 'Settings'],
    hidden: [],
  },
];

export const ROLE_MATRIX: ExpectedCell[] = [...WORKSPACE_NAV_MATRIX, ...PERSONAL_NAV_MATRIX];
