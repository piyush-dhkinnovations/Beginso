/**
 * The hand-written expected cross-role table. Written from the wireframe's roles screen
 * (16. Roles & Permissions, rolesContent()) and the requirements — deliberately never
 * derived from src/lib/roles.ts's CAPABILITIES/canManageMembers/canViewAudit/canViewTemplates, so
 * this test fails the moment the matrix file and the wireframe drift apart instead of trivially
 * agreeing with whatever the implementation already does.
 *
 * Scope: navigation and shells only — WorkspaceSidebar and
 * PersonalSidebar. Pages/actions and the per-form grant context are not covered yet;
 * this file's `Ctx`/`ExpectedCell` shape already anticipates them.
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

// Workspace shell nav (WorkspaceSidebar)
// Wireframe: appSidebar()/setRole() (Beginso-Design-System .../wireframes/index.html:596-700).
// Home/Forms/Activity are visible to every role — Activity is explicitly not manager-only
// ("seeing what happened in a workspace you belong to is not
// manager-only"). Team and Audit Log are owner/admin only. Templates is not asserted in this
// table.
// 'Responses' is visible to every role, same as Activity — collaboration signals are not manager-only.
const WORKSPACE_NAV_BASE = ['Home', 'Forms', 'Responses', 'Activity'];

export const WORKSPACE_NAV_MATRIX: ExpectedCell[] = [
  {
    role: 'owner',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: [...WORKSPACE_NAV_BASE, 'Team', 'Audit log'],
    hidden: [],
  },
  {
    role: 'admin',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: [...WORKSPACE_NAV_BASE, 'Team', 'Audit log'],
    hidden: [],
  },
  {
    role: 'member',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: WORKSPACE_NAV_BASE,
    hidden: ['Team', 'Audit log'],
  },
  {
    role: 'viewer',
    ctx: 'workspace',
    screen: 'WorkspaceSidebar',
    visible: WORKSPACE_NAV_BASE,
    hidden: ['Team', 'Audit log'],
  },
];

// Personal shell nav (PersonalSidebar)
// Role is not meaningful in personal context (the caller owns everything) — one cell, owner by
// convention. Items that hide for an empty account are asserted
// only in the "caller has forms" state; their separate empty-account hiding behaviour is already
// covered by PersonalSidebar.test.tsx and is not re-tested here.
export const PERSONAL_NAV_MATRIX: ExpectedCell[] = [
  {
    role: 'owner',
    ctx: 'personal',
    screen: 'PersonalSidebar',
    visible: ['Home', 'Forms', 'Shared with me', 'Templates', 'Responses', 'Settings'],
    hidden: ['Reports'],
  },
];

export const ROLE_MATRIX: ExpectedCell[] = [...WORKSPACE_NAV_MATRIX, ...PERSONAL_NAV_MATRIX];
