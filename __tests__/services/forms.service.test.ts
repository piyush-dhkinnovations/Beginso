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

// sprint-10-events-migration, tasks.md 2.2 — Backend contract to confirm (BE 0.6); written against
// the "extend GET /api/forms/:id" shape, degrading every unconfirmed stat to null.
describe('formsService.getFormOverview', () => {
  const FORM = { _id: 'f1', title: 'Survey', status: 'draft', responseCount: 7, workspaceId: null };

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('calls GET /api/forms/:id and reads stats from an extended response', async () => {
    mockGet.mockResolvedValueOnce({
      data: { ...FORM, responseCountThisWeek: 3, completionRate: 62.5 },
    });

    const { form, stats } = await formsService.getFormOverview('f1');

    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1');
    expect(form.title).toBe('Survey');
    expect(stats).toEqual({ responseCount: 7, responseCountThisWeek: 3, completionRate: 62.5 });
  });

  it('degrades unconfirmed stats to null (not 0) when the backend has not extended the endpoint', async () => {
    mockGet.mockResolvedValueOnce({ data: FORM });

    const { stats } = await formsService.getFormOverview('f1');

    expect(stats).toEqual({ responseCount: 7, responseCountThisWeek: null, completionRate: null });
  });

  it('unwraps a { form } envelope', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, form: FORM } });

    const { form } = await formsService.getFormOverview('f1');

    expect(form._id).toBe('f1');
  });
});
