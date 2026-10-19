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
  sharedByName: 'Priya Shah',
  workspaceName: null,
  role: 'viewer',
  accessLevel: 'read',
  sharedAt: '2026-09-11T00:00:00.000Z',
};
// Raw wire shape — mirrors the live-confirmed response: a flat `sharedByName`, plus a raw
// `sharedBy` userId the app never displays directly (services/shared.ts's own
// resolveSharedByName() picks the flat field first).
const RAW_SHARE = { ...SHARE, sharedBy: 'u-priya' };

describe('sharedService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('list() calls GET /api/shared-with-me, unwraps a { forms } envelope, and resolves sharedByName from the flat field', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, forms: [RAW_SHARE], total: 1 } });

    const result = await sharedService.list();

    expect(mockGet).toHaveBeenCalledWith('/api/shared-with-me');
    expect(result).toEqual([SHARE]);
  });

  it('resolves sharedByName from a nested sharedBy object when the flat field is absent', async () => {
    const raw = { ...SHARE, sharedByName: undefined, sharedBy: { name: 'Priya Shah' } };
    delete raw.sharedByName;
    mockGet.mockResolvedValueOnce({ data: { forms: [raw] } });

    const result = await sharedService.list();

    expect(result[0].sharedByName).toBe('Priya Shah');
  });

  it('leaves sharedByName undefined, never a raw id, when the backend gives no name at all', async () => {
    const raw = { ...SHARE, sharedByName: undefined, sharedBy: 'u-priya' };
    delete raw.sharedByName;
    mockGet.mockResolvedValueOnce({ data: { forms: [raw] } });

    const result = await sharedService.list();

    expect(result[0].sharedByName).toBeUndefined();
  });

  it('list() falls back to a bare array if the response is ever shaped that way', async () => {
    mockGet.mockResolvedValueOnce({ data: [RAW_SHARE] });

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

  it('list() keeps the logo or icon of the form that the backend sends, and leaves it off when it sends none', async () => {
    mockGet.mockResolvedValueOnce({ data: { forms: [{ ...RAW_SHARE, branding: { logoUrl: 'https://x/y.png', iconName: null } }, RAW_SHARE] } });
    const result = await sharedService.list();
    expect(result[0].branding).toEqual({ logoUrl: 'https://x/y.png', iconName: null });
    expect(result[1]).not.toHaveProperty('branding');
  });
});
