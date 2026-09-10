import type { Role } from '@/types/workspace';

// Single source for role display labels (requirements.md §7.1) — the backend wire value is
// never renamed and never sent capitalized; only this frontend display layer maps it. Every
// screen that shows a role imports this rather than re-deriving or hardcoding a label.
export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Editor',
  viewer: 'Reviewer',
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
export const CAPABILITIES: readonly CapabilityGroup[] = [
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
    ],
  },
  {
    group: 'Workspace',
    items: [
      { key: 'workspace:members', label: 'Manage members', roles: ['owner', 'admin'] },
      { key: 'workspace:settings', label: 'Manage workspace settings', roles: ['owner', 'admin'] },
    ],
  },
];

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

export function canDeleteForm(role: Role | undefined): boolean {
  return role !== undefined && hasCapability(role, 'forms:delete');
}
