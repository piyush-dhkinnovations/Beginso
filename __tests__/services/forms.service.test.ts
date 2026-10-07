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

  it('sends workspaceId=personal and the explicit personal header when scoped to personal space', async () => {
    await formsService.getForms({ limit: 10 }, { type: 'personal' });

    const [, config] = mockGet.mock.calls[0];
    expect(config.headers).toEqual({ 'x-workspace-slug': 'personal' });
    expect(config.params).toEqual({ limit: 10, workspaceId: 'personal' });
  });

  it('filters out workspace-owned forms from a personal-context response — the confirmed-live follow-up bug: workspaceId=personal is not honored for a brand-new user whose default workspace is the one they just joined via invite accept', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        forms: [
          { _id: 'f1', title: 'My personal form', workspaceId: null },
          { _id: 'f2', title: 'Leaked workspace form', workspaceId: 'w1' },
        ],
        total: 2,
        page: 1,
        limit: 10,
      },
    });

    const result = await formsService.getForms({ limit: 10 }, { type: 'personal' });

    expect(result.forms.map((f) => f._id)).toEqual(['f1']);
  });

  it('does not filter for a workspace context — a workspace legitimately lists its own forms', async () => {
    mockGet.mockResolvedValueOnce({
      data: { forms: [{ _id: 'f2', title: 'Workspace form', workspaceId: 'w1' }], total: 1, page: 1, limit: 10 },
    });

    const result = await formsService.getForms({ limit: 10 }, { type: 'workspace', workspaceId: 'acme' });

    expect(result.forms).toHaveLength(1);
  });
});

// sprint-10-events-migration, tasks.md 2.2. Real bug found and fixed (22 Sep 2026): this was
// originally written against "extend GET /api/forms/:id with stats" (BE 0.6's smaller-diff
// guess, no live example existed yet). Confirmed live that the backend instead built a genuinely
// separate `GET /api/forms/:id/overview` route returning a slim `{ overview: {...} }` object with
// no `slug`/`fields`/`pages` — so this now calls both: the base route for the full form (which
// never gained stats fields at all), the new route for the stats themselves.
describe('formsService.getFormOverview', () => {
  const FORM = { _id: 'f1', title: 'Survey', status: 'draft', responseCount: 7, workspaceId: null, slug: 'survey-abc' };

  beforeEach(() => {
    mockGet.mockReset();
  });

  it('calls both GET /api/forms/:id and GET /api/forms/:id/overview, merging the full form with the real stats', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/forms/f1/overview') {
        return Promise.resolve({ data: { success: true, overview: { formId: 'f1', responseCount: 7, responseCountThisWeek: 3, completionRate: 62.5 } } });
      }
      return Promise.resolve({ data: FORM });
    });

    const { form, stats } = await formsService.getFormOverview('f1');

    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1');
    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1/overview');
    expect(form.title).toBe('Survey');
    expect(form.slug).toBe('survey-abc');
    expect(stats).toEqual({ responseCount: 7, responseCountThisWeek: 3, completionRate: 62.5 });
  });

  it('degrades stats to null (not fabricated) if the overview endpoint errors', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/forms/f1/overview') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: FORM });
    });

    const { stats } = await formsService.getFormOverview('f1');

    expect(stats).toEqual({ responseCount: 7, responseCountThisWeek: null, completionRate: null });
  });

  it('unwraps a { form } envelope from the base route', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/forms/f1/overview') return Promise.resolve({ data: { overview: {} } });
      return Promise.resolve({ data: { success: true, form: FORM } });
    });

    const { form } = await formsService.getFormOverview('f1');

    expect(form._id).toBe('f1');
  });

  it('unwraps a { overview } envelope from the stats route', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/forms/f1/overview') {
        return Promise.resolve({ data: { success: true, overview: { responseCount: 99, responseCountThisWeek: 1, completionRate: 10 } } });
      }
      return Promise.resolve({ data: FORM });
    });

    const { stats } = await formsService.getFormOverview('f1');

    expect(stats.responseCount).toBe(99);
  });
});
