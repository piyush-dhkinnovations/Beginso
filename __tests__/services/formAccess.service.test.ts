/**
 * Built against `API_CONTRACT.md` (live,
 * confirmed by direct probe — see formAccessService's own comment), not the
 * pre-backend placeholder sketch (`/access`, `grantId`), which was wrong.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { formAccessService } from '@/services/formAccess';
import type { FormAccessGrant } from '@/types/team';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

const GRANT: FormAccessGrant = { userId: 'u1', email: 'sam@example.com', role: 'viewer', accessLevel: 'read' };

describe('formAccessService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('listGrants() calls GET .../grants and unwraps a { grants } envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { grants: [GRANT] } });

    const result = await formAccessService.listGrants('f1');

    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1/grants');
    expect(result).toEqual([GRANT]);
  });

  it('listGrants() falls back to a bare array if the response is ever shaped that way', async () => {
    mockGet.mockResolvedValueOnce({ data: [GRANT] });

    const result = await formAccessService.listGrants('f1');

    expect(result).toEqual([GRANT]);
  });

  // Regression test for the same class of bug that crashed sharedService in production
  // (`shares.map is not a function`) — a truthy-but-non-array envelope must return [], not the
  // raw envelope object.
  it('returns an empty array, not the raw envelope, when the expected key is missing', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, someOtherKey: [GRANT] } });

    const result = await formAccessService.listGrants('f1');

    expect(result).toEqual([]);
  });

  it('grant() POSTs the email and role, works identically for a workspace or personal form', async () => {
    mockPost.mockResolvedValueOnce({ data: { grant: GRANT } });

    const result = await formAccessService.grant('f1', 'sam@example.com', 'viewer');

    expect(mockPost).toHaveBeenCalledWith('/api/forms/f1/grants', { email: 'sam@example.com', role: 'viewer' });
    expect(result).toEqual(GRANT);
  });

  it('revoke() DELETEs the grant by userId, not a separate grant id', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });

    await formAccessService.revoke('f1', 'u1');

    expect(mockDelete).toHaveBeenCalledWith('/api/forms/f1/grants/u1');
  });
});
