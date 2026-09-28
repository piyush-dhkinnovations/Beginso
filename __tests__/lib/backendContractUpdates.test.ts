/**
 * 28 Sep 2026 backend contract changes (API_CONTRACT.md): six role values, code-based error
 * messages, ownership transfer / leave calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasCapability, ROLE_LABELS, canViewTemplates, canManageMembers } from '@/lib/roles';
import { getFriendlyErrorMessage } from '@/lib/errorHelpers';
import { teamService } from '@/services/team';
import axiosInstance from '@/lib/axios';

vi.mock('@/lib/axios', () => ({ default: { post: vi.fn().mockResolvedValue({ data: {} }), get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const apiError = (status: number, code?: string, message = 'raw backend text') => ({
  response: { status, data: { error: { code, message } } },
});

describe('roles: editor is member, reviewer is viewer', () => {
  it('labels every one of the six wire values', () => {
    expect(ROLE_LABELS.editor).toBe('Editor');
    expect(ROLE_LABELS.reviewer).toBe('Reviewer');
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(['admin', 'editor', 'member', 'owner', 'reviewer', 'viewer']);
  });

  it('an editor has exactly what a member has, a reviewer what a viewer has', () => {
    for (const key of ['forms:create', 'forms:publish', 'responses:view', 'responses:export', 'workspace:members']) {
      expect(hasCapability('editor', key)).toBe(hasCapability('member', key));
      expect(hasCapability('reviewer', key)).toBe(hasCapability('viewer', key));
    }
    expect(hasCapability('editor', 'forms:create')).toBe(true);
    expect(hasCapability('reviewer', 'forms:create')).toBe(false);
    expect(canManageMembers('editor')).toBe(false);
  });

  it('templates are hidden for a reviewer as well as a viewer', () => {
    expect(canViewTemplates('viewer')).toBe(false);
    expect(canViewTemplates('reviewer')).toBe(false);
    expect(canViewTemplates('editor')).toBe(true);
  });
});

describe('getFriendlyErrorMessage: backend error codes', () => {
  it.each([
    [429, 'RATE_LIMITED', /too often/i],
    [403, 'ADMIN_REQUIRES_OWNER', /owner can change or remove an admin/i],
    [400, 'LAST_OWNER', /transfer ownership/i],
    [413, 'PAYLOAD_TOO_LARGE', /too large/i],
    [409, 'OWNS_SHARED_WORKSPACES', /still own a workspace/i],
    [401, 'REAUTH_EXPIRED', /expired/i],
  ])('%i %s', (status, code, expected) => {
    expect(getFriendlyErrorMessage(apiError(status, code))).toMatch(expected);
  });

  it('a 429 or 413 without a code still gets a sentence, never the raw body', () => {
    expect(getFriendlyErrorMessage(apiError(429))).toMatch(/too often/i);
    expect(getFriendlyErrorMessage(apiError(413))).toMatch(/too large/i);
  });

  it('other errors keep the backend message', () => {
    expect(getFriendlyErrorMessage(apiError(400, 'SOMETHING_ELSE', 'Name is required'))).toBe('Name is required');
  });
});

describe('teamService: ownership and leaving', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transferOwnership posts the new owner user id', async () => {
    await teamService.transferOwnership('acme', 'u-2');
    expect(axiosInstance.post).toHaveBeenCalledWith('/api/workspaces/acme/transfer-ownership', { userId: 'u-2' });
  });

  it('leave posts to the workspace', async () => {
    await teamService.leave('acme');
    expect(axiosInstance.post).toHaveBeenCalledWith('/api/workspaces/acme/leave');
  });
});
