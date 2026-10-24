/**
 * __tests__/lib/roles.test.ts
 * Feature: sprint-9-team-permissions, requirements.md §7.1, §16 — the ROLE_LABELS/CAPABILITIES
 * coverage regression test named as the minimum bar for task 1.1.
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_LABELS,
  CAPABILITIES,
  hasCapability,
  canManageMembers,
  canDeleteForm,
  canViewTemplates,
  canViewAudit,
  canActOnResponses,
  canManageStages,
  canManageTags,
  canConfigureResponses,
} from '@/lib/roles';
import type { Role } from '@/types/workspace';

const ALL_ROLES: Role[] = ['owner', 'admin', 'member', 'editor', 'viewer', 'reviewer'];

describe('ROLE_LABELS', () => {
  it('covers exactly the six wire Role values, nothing more or fewer', () => {
    const keys = Object.keys(ROLE_LABELS).sort();
    expect(keys).toEqual([...ALL_ROLES].sort());
  });

  it('never re-cases the wire value into the label key', () => {
    expect(ROLE_LABELS.owner).toBe('Owner');
    expect(ROLE_LABELS.admin).toBe('Admin');
    expect(ROLE_LABELS.member).toBe('Editor');
    expect(ROLE_LABELS.viewer).toBe('Reviewer');
  });
});

describe('CAPABILITIES / hasCapability', () => {
  it('reserves form deletion for owner only', () => {
    expect(hasCapability('owner', 'forms:delete')).toBe(true);
    expect(hasCapability('admin', 'forms:delete')).toBe(false);
    expect(hasCapability('member', 'forms:delete')).toBe(false);
    expect(hasCapability('viewer', 'forms:delete')).toBe(false);
  });

  it('lets every role view responses', () => {
    for (const role of ALL_ROLES) {
      expect(hasCapability(role, 'responses:view')).toBe(true);
    }
  });

  it('returns false for an unknown capability key rather than throwing', () => {
    expect(hasCapability('owner', 'not-a-real-key')).toBe(false);
  });
});

describe('canManageMembers', () => {
  it('is true only for owner/admin', () => {
    expect(canManageMembers('owner')).toBe(true);
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('member')).toBe(false);
    expect(canManageMembers('viewer')).toBe(false);
  });

  it('fails closed when the role is not yet known', () => {
    expect(canManageMembers(undefined)).toBe(false);
  });
});

// Sprint 10, tasks.md 1.4 — one more entry in the single CAPABILITIES source, not a second matrix.
describe('workspace:audit / canViewAudit', () => {
  it('is granted to owner and admin only', () => {
    expect(hasCapability('owner', 'workspace:audit')).toBe(true);
    expect(hasCapability('admin', 'workspace:audit')).toBe(true);
    expect(hasCapability('member', 'workspace:audit')).toBe(false);
    expect(hasCapability('viewer', 'workspace:audit')).toBe(false);
  });

  it('canViewAudit mirrors the capability and fails closed on an unknown role', () => {
    expect(canViewAudit('owner')).toBe(true);
    expect(canViewAudit('viewer')).toBe(false);
    expect(canViewAudit(undefined)).toBe(false);
  });

  it('lives in the Workspace group of the one matrix, exactly once', () => {
    const keys = CAPABILITIES.flatMap((g) => g.items).map((i) => i.key);
    expect(keys.filter((k) => k === 'workspace:audit')).toHaveLength(1);
    const workspace = CAPABILITIES.find((g) => g.group === 'Workspace')!;
    expect(workspace.items.map((i) => i.key)).toContain('workspace:audit');
  });
});

describe('canDeleteForm', () => {
  it('is true only for owner', () => {
    expect(canDeleteForm('owner')).toBe(true);
    expect(canDeleteForm('admin')).toBe(false);
  });

  it('fails closed when the role is not yet known', () => {
    expect(canDeleteForm(undefined)).toBe(false);
  });
});

// Sprint 12 (inbox-collaboration), requirements.md §14 — 4 roles × 3 new capabilities (task 1.2).
// `member`/`viewer` are listed directly on CAPABILITIES; `editor`/`reviewer` are asserted here as
// their automatic aliases (withAliases()) rather than listed a second time in roles.ts.
describe('responses:act / canActOnResponses', () => {
  it('is granted to every role, including reviewer (design.md §11.3)', () => {
    for (const role of ALL_ROLES) {
      expect(hasCapability(role, 'responses:act')).toBe(true);
      expect(canActOnResponses(role)).toBe(true);
    }
  });

  it('fails closed when the role is not yet known', () => {
    expect(canActOnResponses(undefined)).toBe(false);
  });
});

describe('stages:manage / canManageStages', () => {
  it('is granted to owner/admin (and their aliases) only', () => {
    expect(canManageStages('owner')).toBe(true);
    expect(canManageStages('admin')).toBe(true);
    expect(canManageStages('member')).toBe(false);
    expect(canManageStages('editor')).toBe(false);
    expect(canManageStages('viewer')).toBe(false);
    expect(canManageStages('reviewer')).toBe(false);
  });

  it('fails closed when the role is not yet known', () => {
    expect(canManageStages(undefined)).toBe(false);
  });
});

describe('tags:manage / canManageTags', () => {
  it('is granted to owner/admin only', () => {
    expect(canManageTags('owner')).toBe(true);
    expect(canManageTags('admin')).toBe(true);
    expect(canManageTags('member')).toBe(false);
    expect(canManageTags('viewer')).toBe(false);
  });

  it('fails closed when the role is not yet known', () => {
    expect(canManageTags(undefined)).toBe(false);
  });
});

describe('canConfigureResponses', () => {
  it('is for the owner and admins only, and fails closed while the role is unknown', () => {
    expect(canConfigureResponses('owner')).toBe(true);
    expect(canConfigureResponses('admin')).toBe(true);
    expect(canConfigureResponses('member')).toBe(false);
    expect(canConfigureResponses('editor')).toBe(false);
    expect(canConfigureResponses('viewer')).toBe(false);
    expect(canConfigureResponses('reviewer')).toBe(false);
    expect(canConfigureResponses(undefined)).toBe(false);
  });
});

describe('canViewTemplates', () => {
  it('is false only for viewer', () => {
    expect(canViewTemplates('owner')).toBe(true);
    expect(canViewTemplates('admin')).toBe(true);
    expect(canViewTemplates('member')).toBe(true);
    expect(canViewTemplates('viewer')).toBe(false);
  });

  it('does not fail closed when the role is not yet known — unlike canManageMembers/canDeleteForm', () => {
    expect(canViewTemplates(undefined)).toBe(true);
  });
});

describe('CAPABILITIES shape', () => {
  it('groups Forms, Responses, and Workspace, per design.md §13', () => {
    expect(CAPABILITIES.map((g) => g.group)).toEqual(['Forms', 'Responses', 'Workspace']);
  });
});
