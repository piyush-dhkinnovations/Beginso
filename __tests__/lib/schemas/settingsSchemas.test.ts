/**
 * __tests__/lib/schemas/settingsSchemas.test.ts
 * Feature: sprint-6-settings
 * Tests: profileNameSchema, workspaceNameSchema, changePasswordSchema
 * Requirements: 14.1
 */

import { describe, it, expect } from 'vitest';
import { profileNameSchema, workspaceNameSchema, changePasswordSchema } from '@/lib/schemas/settingsSchemas';

describe('profileNameSchema', () => {
  it('accepts a name within 2-50 characters', () => {
    expect(profileNameSchema.safeParse({ name: 'Jo' }).success).toBe(true);
    expect(profileNameSchema.safeParse({ name: 'A'.repeat(50) }).success).toBe(true);
  });

  it('rejects a name under 2 characters', () => {
    expect(profileNameSchema.safeParse({ name: 'J' }).success).toBe(false);
  });

  it('rejects a name over 50 characters', () => {
    expect(profileNameSchema.safeParse({ name: 'A'.repeat(51) }).success).toBe(false);
  });
});

describe('workspaceNameSchema', () => {
  it('accepts a name within 2-100 characters', () => {
    expect(workspaceNameSchema.safeParse({ name: 'Acme' }).success).toBe(true);
    expect(workspaceNameSchema.safeParse({ name: 'A'.repeat(100) }).success).toBe(true);
  });

  it('rejects a name under 2 characters', () => {
    expect(workspaceNameSchema.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('rejects a name over 100 characters', () => {
    expect(workspaceNameSchema.safeParse({ name: 'A'.repeat(101) }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = { currentPassword: 'oldpass1', newPassword: 'newpass1', confirmNewPassword: 'newpass1' };

  it('accepts matching passwords with a non-empty current password', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty current password', () => {
    expect(changePasswordSchema.safeParse({ ...valid, currentPassword: '' }).success).toBe(false);
  });

  it('rejects a new password under 8 characters', () => {
    const result = changePasswordSchema.safeParse({ ...valid, newPassword: 'short1', confirmNewPassword: 'short1' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched new/confirm passwords, attributing the error to confirmNewPassword', () => {
    const result = changePasswordSchema.safeParse({ ...valid, confirmNewPassword: 'different1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['confirmNewPassword']);
    }
  });
});
