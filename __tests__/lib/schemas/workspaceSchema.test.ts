import { describe, it, expect } from 'vitest';
import { createWorkspaceSchema } from '@/lib/schemas/workspaceSchema';

const message = (name: string) => {
  const r = createWorkspaceSchema.safeParse({ name });
  return r.success ? null : r.error.issues[0].message;
};

describe('createWorkspaceSchema', () => {
  it('asks for a name when empty, and for at least 2 characters when it is one letter (QA A3-005: "a" created a workspace)', () => {
    expect(message('')).toBe('Workspace name is required');
    expect(message('   ')).toBe('Workspace name is required');
    expect(message('a')).toBe('Workspace name must be at least 2 characters');
    expect(message('ab')).toBeNull();
    expect(message('a'.repeat(100))).toBeNull();
    expect(message('a'.repeat(101))).toBe('Name must be 100 characters or less');
  });
});
