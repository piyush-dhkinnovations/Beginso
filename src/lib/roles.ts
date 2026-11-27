import type { Role } from '@/types/workspace';

// Single source for role display labels — the backend wire value is
// never renamed and never sent capitalized; only this frontend display layer maps it. Every
// screen that shows a role imports this rather than re-deriving or hardcoding a label.
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Editor',
  editor: 'Editor',
  viewer: 'Reviewer',
  reviewer: 'Reviewer',
};

/** The label for a role string of unknown origin (a switcher row, a header): the shared map, else the word with a capital. */
export const roleLabel = (role: string | null | undefined): string | null =>
  role ? (ROLE_LABELS as Record<string, string>)[role] ?? role.charAt(0).toUpperCase() + role.slice(1) : null;

export interface CapabilityItem {
  key: string;
  label: string;
  roles: readonly Role[];
}

export interface CapabilityGroup {
  group: string;
  items: readonly CapabilityItem[];
}

// Frontend-side mirror of what requirePermission() must enforce — written
// from the same wireframe source (rolesContent()) the backend matrix is. This file is not itself
// the authorization boundary: every check here is a convenience (hiding a
// nav item, disabling a button), never the real gate.
//
// Typed as CapabilityGroup[]/CapabilityItem rather than a literal `as const` tuple
// — TS can't infer a clean flatMap()/find() return type across a tuple of
// object-literal types that each have a different `roles` literal-union shape; typing `roles` as
// `readonly Role[]` up front avoids the cast that version would have needed.
// The backend treats `editor` as `member` and `reviewer` as `viewer`, so a capability granted to one
// is granted to its alias: written once with the original four names and expanded below.
const withAliases = (roles: readonly Role[]): readonly Role[] => [
  ...roles,
  ...(roles.includes('member') ? (['editor'] as const) : []),
  ...(roles.includes('viewer') ? (['reviewer'] as const) : []),
];

const RAW_CAPABILITIES: readonly CapabilityGroup[] = [
  {
    group: 'Forms',
    items: [
      { key: 'forms:create', label: 'Create form', roles: ['owner', 'admin', 'member'] },
      { key: 'forms:edit', label: 'Edit form', roles: ['owner', 'admin', 'member'] },
      { key: 'forms:publish', label: 'Publish form', roles: ['owner', 'admin'] },
      // The Responses page's own stages, table columns and board card ("Customize"). The server enforces it (forms:configure).
      { key: 'forms:configure', label: 'Customize how responses are shown', roles: ['owner', 'admin'] },
      { key: 'forms:delete', label: 'Delete form', roles: ['owner'] },
    ],
  },
  {
    group: 'Responses',
    items: [
      { key: 'responses:view', label: 'View responses', roles: ['owner', 'admin', 'member', 'viewer'] },
      { key: 'responses:export', label: 'Export responses', roles: ['owner', 'admin', 'member'] },
      { key: 'responses:delete', label: 'Delete responses', roles: ['owner', 'admin'] },
      // Tag, assign, note,
      // score and change stage. Matches the wireframe's own `act` capability; granted to Reviewer
      // too, same as `responses:view` above.
      { key: 'responses:act', label: 'Tag, assign, note and change stage', roles: ['owner', 'admin', 'member', 'viewer'] },
      { key: 'stages:manage', label: 'Manage pipeline stages', roles: ['owner', 'admin'] },
      { key: 'tags:manage', label: 'Manage tag library', roles: ['owner', 'admin'] },
      // Criteria management is Owner/Admin (same as stage management); scoring a response
      // itself is `responses:act`, already granted above.
      { key: 'scoring:manage', label: 'Manage scoring criteria', roles: ['owner', 'admin'] },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'workspace:members', label: 'Manage members', roles: ['owner', 'admin'] },
      { key: 'workspace:settings', label: 'Manage workspace settings', roles: ['owner', 'admin'] },
      // The Audit Log is a security record, not a general feed.
      { key: 'workspace:audit', label: 'View audit log', roles: ['owner', 'admin'] },
    ],
  },
];

export const CAPABILITIES: readonly CapabilityGroup[] = RAW_CAPABILITIES.map((g) => ({
  group: g.group,
  items: g.items.map((i) => ({ ...i, roles: withAliases(i.roles) })),
}));

export function hasCapability(role: Role, capabilityKey: string): boolean {
  const item = CAPABILITIES.flatMap((g) => g.items).find((i) => i.key === capabilityKey);
  return item ? item.roles.includes(role) : false;
}

// Named capability helpers — thin wrappers over
// hasCapability() so a call site reads as intent ("can this role manage members") rather than a
// string key it has to already know.
export function canManageMembers(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'workspace:members');
}

// Workspace Settings page (/w/[slug]/settings): General + Branding are owner/admin only — same
// role set as managing members. Tags/Stages/Scoring keep their own capability checks.
export function canManageWorkspaceSettings(role: Role | undefined): boolean {
  return canManageMembers(role);
}

// Backend grants dashboard:manage to owner and admin only. Convenience gate; the server enforces it.
export function canManageDashboard(role: Role | undefined): boolean {
  return canManageMembers(role);
}

export function canViewAudit(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'workspace:audit');
}

export function canDeleteForm(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:delete');
}

// Named helpers for the response-handling and scoring
// capabilities, matching this file's own canManageMembers/canViewAudit precedent.
export function canActOnResponses(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'responses:act');
}

export function canConfigureResponses(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:configure');
}

export function canManageStages(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'stages:manage');
}

export function canManageTags(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'tags:manage');
}

// Convenience gates only; the server is the authority. Exports is
// visible to every role (a Reviewer can export - every export is logged), failing
// closed only while the role is still unknown. Charts are created/edited with form edit rights.
export function canViewExports(role: Role | undefined): boolean {
  return role !== undefined;
}

export function canEditCharts(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:edit');
}

export function canManageScoring(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'scoring:manage');
}

// Role-filtered navigation — exact rule from the wireframe's own
// appSidebar()/setRole() (index.html lines 596-700): in a workspace, Reviewer never sees
// Templates; every other role does. Not part of CAPABILITIES above — that matrix is the
// Forms/Responses/Workspace reference table, and Templates visibility isn't a capability
// row in it (the wireframe treats it as a separate nav-filter rule, not a rolesContent() entry).
//
// Deliberately does NOT fail closed on `undefined` (unlike canManageMembers/canDeleteForm):
// Templates is visible to every other role, and hiding it while the role is still loading would
// take it from everyone, for a purely cosmetic nav filter. The server decides who may read
// templates.
export function canViewTemplates(role: Role | undefined): boolean {
  return role !== 'viewer' && role !== 'reviewer';
}

// Convenience mirrors of the server's
// permission matrix, each reusing an existing capability row so RolesMatrix stays unchanged. None of
// these is the authorization boundary: the backend's requirePermission() is. Callers on a *personal*
// form pass 'owner' (the creator is always the owner of their own form).
/** Publish, Unpublish, Generate new link — server: forms:publish. */
export function canPublishForm(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:publish');
}

/** Archive / Unarchive — Owner/Admin, same tier as publish. */
export function canArchiveForm(role: Role | undefined): boolean {
  return canPublishForm(role);
}

/** Restore a single response from Trash — Owner/Admin, matches responses:delete. */
export function canRestoreResponse(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'responses:delete');
}

/** Publish a form to the workspace's templates — Editor and above (Reviewers cannot create forms). */
export function canPublishTemplate(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:create');
}

/** The Share & Embed page and nav item — hidden from Reviewers (wireframe 34). */
export function canSeeShare(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:edit');
}

/** Create Form buttons — Editor and above. Presentation only: POST /api/forms enforces forms:create. Hidden while the role is still loading. */
export function canCreateForm(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:create');
}
