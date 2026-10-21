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

// GET /api/workspaces/:id/events|audit needs the real Mongo id, not the URL slug every /w/[slug]
// page actually has — eventsService resolves it internally via GET /api/workspaces/:idOrSlug
// (workspacesService.get(), confirmed to accept either) before the real call. 'w1' below is a
// slug (not 24 hex chars), so it takes that resolve path; mock its response first.
function mockWorkspaceResolve(id = 'w1_real_object_id_24c') {
  mockGet.mockResolvedValueOnce({
    data: { workspace: { id, name: 'W1', slug: 'w1', timezone: 'UTC', createdAt: '', updatedAt: '' } },
  });
  return id;
}

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

  it('listWorkspaceActivity() resolves the slug to a real id, then calls GET /api/workspaces/:id/events', async () => {
    const realId = mockWorkspaceResolve();
    mockGet.mockResolvedValueOnce({ data: [EVENT] });

    await eventsService.listWorkspaceActivity('w1', 3, 20);

    expect(mockGet).toHaveBeenCalledWith(`/api/workspaces/${realId}/events`, { params: { page: 3, limit: 20 } });
  });

  it('listWorkspaceActivity() skips the resolve call when already given a real Mongo id', async () => {
    mockGet.mockResolvedValueOnce({ data: [EVENT] });

    await eventsService.listWorkspaceActivity('507f1f77bcf86cd799439011', 1, 20);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/workspaces/507f1f77bcf86cd799439011/events', { params: { page: 1, limit: 20 } });
  });

  it('listAudit() sends actorId and turns a range into a `from` timestamp server-side filter', async () => {
    mockWorkspaceResolve();
    mockGet.mockResolvedValueOnce({ data: { events: [] } });

    await eventsService.listAudit('w1', { actorId: 'u1', range: '7d' });

    const [url, config] = mockGet.mock.calls[1];
    expect(url).toBe('/api/workspaces/w1_real_object_id_24c/audit');
    expect(config.params.actorId).toBe('u1');
    const ageMs = Date.now() - new Date(config.params.from).getTime();
    expect(ageMs).toBeGreaterThan(6.9 * 86_400_000);
    expect(ageMs).toBeLessThan(7.1 * 86_400_000);
  });

  it('listAudit() sends no `from` for the All Time range', async () => {
    mockWorkspaceResolve();
    mockGet.mockResolvedValueOnce({ data: [] });

    await eventsService.listAudit('w1', { range: 'all' });

    expect(mockGet.mock.calls[1][1].params.from).toBeUndefined();
  });

  it('returns [] instead of a non-array when the envelope key is wrong (shares.map crash precedent)', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, items: [EVENT] } });

    await expect(eventsService.listFormEvents('f1')).resolves.toEqual([]);
  });

  it('maps the real nested `actor: { name }` shape onto `actorName` — the real bug: every event came back with actor nested, not flat, so AuditTable/ActivityFeed rendered a blank Actor cell for every row', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        events: [
          {
            id: 'e2',
            action: 'member.remove',
            targetType: 'member',
            targetId: 'u1',
            targetLabel: 'jane@example.com',
            createdAt: '2026-09-22T10:19:33.217Z',
            actor: { id: 'u2', name: 'Test User', email: 'test@example.com' },
          },
        ],
      },
    });

    const [event] = await eventsService.listFormEvents('f1');

    expect(event.actorName).toBe('Test User');
  });

  it('falls back to actor.email, then "Unknown", when actor.name is missing', async () => {
    mockGet.mockResolvedValueOnce({
      data: { events: [{ id: 'e3', action: 'x', targetType: 't', targetId: 'x', targetLabel: 'x', createdAt: 'x', actor: { email: 'x@example.com' } }] },
    });
    const [withEmail] = await eventsService.listFormEvents('f1');
    expect(withEmail.actorName).toBe('x@example.com');

    mockGet.mockResolvedValueOnce({
      data: { events: [{ id: 'e4', action: 'x', targetType: 't', targetId: 'x', targetLabel: 'x', createdAt: 'x' }] },
    });
    const [withNothing] = await eventsService.listFormEvents('f1');
    expect(withNothing.actorName).toBe('Unknown');
  });
});

describe('eventsService actor avatars', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  const raw = (actor: Record<string, unknown>) => ({
    data: {
      events: [
        { id: 'e9', action: 'form.publish', targetType: 'form', targetId: 'f1', targetLabel: 'Survey', createdAt: '2026-10-21T10:00:00.000Z', actor },
      ],
    },
  });

  it("keeps the actor's id, email and picture next to their name", async () => {
    mockGet.mockResolvedValueOnce(raw({ id: 'u1', name: 'Piyush', email: 'p@example.com', avatarUrl: 'https://cdn.example.com/a.png' }));
    const [event] = await eventsService.listFormEvents('f1');
    expect(event).toMatchObject({ actorName: 'Piyush', actorId: 'u1', actorEmail: 'p@example.com', actorAvatarUrl: 'https://cdn.example.com/a.png' });
  });

  it('has no picture (undefined) when the backend sends none or null, and no id for an actor without an account', async () => {
    mockGet.mockResolvedValueOnce(raw({ id: '', name: 'Respondent', email: '', avatarUrl: null }));
    const [event] = await eventsService.listFormEvents('f1');
    expect(event.actorAvatarUrl).toBeUndefined();
    expect(event.actorId).toBeUndefined();
    expect(event.actorEmail).toBeUndefined();
    expect(event.actorName).toBe('Respondent');
  });
});
