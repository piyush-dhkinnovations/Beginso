import type { Role } from '@/types/workspace';

// Single source for role display labels (requirements.md §7.1) — the backend wire value is
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

export interface CapabilityItem {
  key: string;
  label: string;
  roles: readonly Role[];
}

export interface CapabilityGroup {
  group: string;
  items: readonly CapabilityItem[];
}

// Frontend-side mirror of what requirePermission() must enforce (design.md §11.5/§13) — written
// from the same wireframe source (rolesContent()) the backend matrix is. This file is not itself
// the authorization boundary (requirements.md §14): every check here is a convenience (hiding a
// nav item, disabling a button), never the real gate.
//
// Typed as CapabilityGroup[]/CapabilityItem rather than a literal `as const` tuple (design.md
// §13's own sketch) — TS can't infer a clean flatMap()/find() return type across a tuple of
// object-literal types that each have a different `roles` literal-union shape; typing `roles` as
// `readonly Role[]` up front avoids the cast design.md's version would have otherwise needed.
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
      { key: 'forms:delete', label: 'Delete form', roles: ['owner'] },
    ],
  },
  {
    group: 'Responses',
    items: [
      { key: 'responses:view', label: 'View responses', roles: ['owner', 'admin', 'member', 'viewer'] },
      { key: 'responses:export', label: 'Export responses', roles: ['owner', 'admin', 'member'] },
      { key: 'responses:delete', label: 'Delete responses', roles: ['owner', 'admin'] },
      // Sprint 12 (inbox-collaboration), requirements.md §14 / design.md §11.3 — tag, assign, note,
      // score and change stage. Matches the wireframe's own `act` capability; granted to Reviewer
      // too (design.md §11.3's permission table), same as `responses:view` above.
      { key: 'responses:act', label: 'Tag, assign, note and change stage', roles: ['owner', 'admin', 'member', 'viewer'] },
      { key: 'stages:manage', label: 'Manage pipeline stages', roles: ['owner', 'admin'] },
      { key: 'tags:manage', label: 'Manage tag library', roles: ['owner', 'admin'] },
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'workspace:members', label: 'Manage members', roles: ['owner', 'admin'] },
      { key: 'workspace:settings', label: 'Manage workspace settings', roles: ['owner', 'admin'] },
      // Sprint 10 (requirements.md §7.7) — the Audit Log is a security record, not a general feed.
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

// Named capability helpers (requirements.md §7.1's own examples) — thin wrappers over
// hasCapability() so a call site reads as intent ("can this role manage members") rather than a
// string key it has to already know.
export function canManageMembers(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'workspace:members');
}

export function canViewAudit(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'workspace:audit');
}

export function canDeleteForm(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:delete');
}

// Sprint 12 (inbox-collaboration), requirements.md §14 — named helpers for the three new
// capabilities, matching this file's own canManageMembers/canViewAudit precedent.
export function canActOnResponses(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'responses:act');
}

export function canManageStages(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'stages:manage');
}

export function canManageTags(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'tags:manage');
}

// Role-filtered navigation (requirements.md §7.7) — exact rule from the wireframe's own
// appSidebar()/setRole() (index.html lines 596-700): in a workspace, Reviewer never sees
// Templates; every other role does. Not part of CAPABILITIES above — that matrix is the
// Forms/Responses/Workspace reference table (§7.6), and Templates visibility isn't a capability
// row in it (the wireframe treats it as a separate nav-filter rule, not a rolesContent() entry).
//
// Deliberately does NOT fail closed on `undefined` (unlike canManageMembers/canDeleteForm):
// Templates is an already-shipped feature visible to every current user, not a new one gated
// behind BE 0.1 landing — hiding it for everyone during the backend gap would be a real, avoidable
// regression for a purely cosmetic nav-filter rule (the CAPABILITIES matrix above has no
// `templates:*` entry at all, so nothing server-side actually gates this route by role either).
export function canViewTemplates(role: Role | undefined): boolean {
  return role !== 'viewer' && role !== 'reviewer';
}
