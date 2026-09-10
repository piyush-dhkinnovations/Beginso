/**
 * __tests__/lib/roles.test.ts
 * Feature: sprint-9-team-permissions, requirements.md §7.1, §16 — the ROLE_LABELS/CAPABILITIES
 * coverage regression test named as the minimum bar for task 1.1.
 */

import { describe, it, expect } from 'vitest';
import { ROLE_LABELS, CAPABILITIES, hasCapability, canManageMembers, canDeleteForm } from '@/lib/roles';
import type { Role } from '@/types/workspace';

const ALL_ROLES: Role[] = ['owner', 'admin', 'member', 'viewer'];

describe('ROLE_LABELS', () => {
  it('covers exactly the four wire Role values, nothing more or fewer', () => {
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

describe('canDeleteForm', () => {
  it('is true only for owner', () => {
    expect(canDeleteForm('owner')).toBe(true);
    expect(canDeleteForm('admin')).toBe(false);
  });

  it('fails closed when the role is not yet known', () => {
    expect(canDeleteForm(undefined)).toBe(false);
  });
});

describe('CAPABILITIES shape', () => {
  it('groups Forms, Responses, and Workspace, per design.md §13', () => {
    expect(CAPABILITIES.map((g) => g.group)).toEqual(['Forms', 'Responses', 'Workspace']);
  });
});
