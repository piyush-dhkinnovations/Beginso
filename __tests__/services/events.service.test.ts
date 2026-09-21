/**
 * __tests__/services/events.service.test.ts
 * sprint-10-events-migration, tasks.md 2.1. Backend contract to confirm (BE 0.3–0.5) — runs against
 * a mocked axiosInstance; nothing here is verified against a live backend.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  },
}));

import axiosInstance from '@/lib/axios';
import { eventsService } from '@/services/events';
import type { WorkspaceEventItem } from '@/types/event';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

const EVENT: WorkspaceEventItem = {
  id: 'e1',
  actorName: 'Priya',
  action: 'form.published',
  targetType: 'form',
  targetId: 'f1',
  targetLabel: 'Survey',
  createdAt: '2026-09-21T00:00:00.000Z',
};

describe('eventsService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('listFormEvents() calls GET /api/forms/:id/events with page and limit', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [EVENT] } });

    const events = await eventsService.listFormEvents('f1', 2, 6);

    expect(mockGet).toHaveBeenCalledWith('/api/forms/f1/events', { params: { page: 2, limit: 6 } });
    expect(events).toEqual([EVENT]);
  });

  it('listWorkspaceActivity() calls GET /api/workspaces/:id/events', async () => {
    mockGet.mockResolvedValueOnce({ data: [EVENT] });

    await eventsService.listWorkspaceActivity('w1', 3);

    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/w1/events', { params: { page: 3 } });
  });

  it('listAudit() sends actorId and turns a range into a `from` timestamp server-side filter', async () => {
    mockGet.mockResolvedValueOnce({ data: { events: [] } });

    await eventsService.listAudit('w1', { actorId: 'u1', range: '7d' });

    const [url, config] = mockGet.mock.calls[0];
    expect(url).toBe('/api/workspaces/w1/audit');
    expect(config.params.actorId).toBe('u1');
    const ageMs = Date.now() - new Date(config.params.from).getTime();
    expect(ageMs).toBeGreaterThan(6.9 * 86_400_000);
    expect(ageMs).toBeLessThan(7.1 * 86_400_000);
  });

  it('listAudit() sends no `from` for the All Time range', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await eventsService.listAudit('w1', { range: 'all' });

    expect(mockGet.mock.calls[0][1].params.from).toBeUndefined();
  });

  it('returns [] instead of a non-array when the envelope key is wrong (shares.map crash precedent)', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, items: [EVENT] } });

    await expect(eventsService.listFormEvents('f1')).resolves.toEqual([]);
  });
});
