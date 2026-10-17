import { describe, it, expect } from 'vitest';
import { roleLabel } from '@/lib/roles';

// One role vocabulary everywhere (QA A9-006): the switcher and header showed "member" while the Team table said "Editor".
describe('roleLabel', () => {
  it('maps every wire value to the shared label', () => {
    expect(roleLabel('owner')).toBe('Owner');
    expect(roleLabel('admin')).toBe('Admin');
    expect(roleLabel('member')).toBe('Editor');
    expect(roleLabel('editor')).toBe('Editor');
    expect(roleLabel('viewer')).toBe('Reviewer');
    expect(roleLabel('reviewer')).toBe('Reviewer');
  });

  it('capitalises a role this build does not know, and returns null for none', () => {
    expect(roleLabel('guest')).toBe('Guest');
    expect(roleLabel(undefined)).toBeNull();
    expect(roleLabel('')).toBeNull();
  });
});
