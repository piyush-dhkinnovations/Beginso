/**
 * __tests__/services/shared.service.test.ts
 * Feature: sprint-9-team-permissions, requirements.md §7.9, design.md §12.
 * Built against `backend_updates_for_frontend.md` §13's exact JSON example (live, confirmed by
 * direct probe — see sharedService's own comment). Corrected after a real runtime crash
 * (`shares.map is not a function`) showed the envelope key is `forms`, not `shares`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { sharedService } from '@/services/shared';
import type { SharedFormItem } from '@/types/team';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

const SHARE: SharedFormItem = {
  id: 'f1',
  title: 'Customer Survey',
  sharedBy: 'u-priya',
  workspaceName: null,
  role: 'viewer',
  accessLevel: 'read',
  sharedAt: '2026-09-11T00:00:00.000Z',
};

describe('sharedService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('list() calls GET /api/shared-with-me and unwraps a { forms } envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, forms: [SHARE], total: 1 } });

    const result = await sharedService.list();

    expect(mockGet).toHaveBeenCalledWith('/api/shared-with-me');
    expect(result).toEqual([SHARE]);
  });

  it('list() falls back to a bare array if the response is ever shaped that way', async () => {
    mockGet.mockResolvedValueOnce({ data: [SHARE] });

    const result = await sharedService.list();

    expect(result).toEqual([SHARE]);
  });

  // Regression test for the real crash this fixed: a truthy-but-non-array envelope (wrong key,
  // or a shape neither `forms` nor a bare array) must return [], not something `.map()` throws on.
  it('returns an empty array, not the raw envelope, when the expected key is missing', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, shares: [SHARE] } });

    const result = await sharedService.list();

    expect(result).toEqual([]);
  });
});
