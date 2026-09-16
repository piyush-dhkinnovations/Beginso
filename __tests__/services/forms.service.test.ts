/**
 * __tests__/services/forms.service.test.ts
 * Regression test for a real cross-context data-leak bug: getForms() never told the backend
 * which context (personal vs. which workspace) it was asking for, so every context silently
 * showed the same list (whatever GET /api/forms's workspace-resolution fallback picked).
 * See src/services/forms.ts's own comment for the full root-cause against API_CONTRACT.md's
 * documented "Workspace Resolution" order.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { formsService } from '@/services/forms';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

describe('formsService.getForms', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: { forms: [], total: 0, page: 1, limit: 10 } });
  });

  it('sends no workspace-scoping header or param when called with no context (back-compat)', async () => {
    await formsService.getForms({ limit: 10 });

    const [, config] = mockGet.mock.calls[0];
    expect(config.headers).toBeUndefined();
    expect(config.params).toEqual({ limit: 10 });
  });

  it('sends x-workspace-slug when scoped to a workspace, not a workspaceId query param', async () => {
    await formsService.getForms({ limit: 10 }, { type: 'workspace', workspaceId: 'acme' });

    const [, config] = mockGet.mock.calls[0];
    expect(config.headers).toEqual({ 'x-workspace-slug': 'acme' });
    expect(config.params).toEqual({ limit: 10 });
  });

  it('sends workspaceId=personal when scoped to personal space, no workspace header', async () => {
    await formsService.getForms({ limit: 10 }, { type: 'personal' });

    const [, config] = mockGet.mock.calls[0];
    expect(config.headers).toBeUndefined();
    expect(config.params).toEqual({ limit: 10, workspaceId: 'personal' });
  });
});
