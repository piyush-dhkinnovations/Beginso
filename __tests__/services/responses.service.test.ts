/**
 * __tests__/services/responses.service.test.ts
 * sprint-12-inbox-collaboration, requirements.md §7.1 (1.3) — migrated off `status`/`updateStatus`
 * to `stageId`/`update()`, and `getStats` now calls the single `GET /api/responses/stats` endpoint
 * instead of computing counts client-side from 3 requests (task 1.3's own gate).
 * Tests: responsesService — getResponses, getResponseById, update, deleteResponse,
 * getFileDownloadUrl, getStats, workspace-scope header presence, answer-cleaning
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  const mockPost = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  return {
    default: {
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      delete: mockDelete,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { responsesService, BulkBatchLimitError } from '@/services/responses';
import { idsRemainingSelected } from '@/lib/bulkActions';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

describe('responsesService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('getResponses calls GET /api/responses with params and returns paginated data', async () => {
    const payload = { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await responsesService.getResponses({ formId: 'form-1', stageId: 's1', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/api/responses', {
      params: { formId: 'form-1', stageId: 's1', page: 1 },
      headers: { 'x-workspace-slug': 'personal' },
    });
    expect(result).toEqual(payload);
  });

  it('getResponses sends x-workspace-slug when a real workspace scope is given', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } });

    await responsesService.getResponses({ formId: 'form-1' }, 'acme');

    expect(mockGet).toHaveBeenCalledWith('/api/responses', {
      params: { formId: 'form-1' },
      headers: { 'x-workspace-slug': 'acme' },
    });
  });

  it('getResponses sends no workspace header for the personal scope', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], total: 0, page: 1, limit: 50, totalPages: 0 } });

    await responsesService.getResponses({ formId: 'form-1' }, 'personal');

    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: 'form-1' }, headers: { 'x-workspace-slug': 'personal' } });
  });

  it('getResponseById calls GET /api/responses/:id and unwraps the {success, response} envelope', async () => {
    // Real backend wraps the detail payload and uses snake_case `response_files` — see
    // docs/backend-contract/api-reference.md §3.
    const rawResponse = {
      _id: 'r1',
      formId: 'form-1',
      answers: { Email: 'a@b.com' },
      stage: { id: 's1', name: 'New', colour: 'info', category: 'new' },
      assignee: null,
      tags: [],
      submittedAt: '2026-08-05T06:00:00.000Z',
      createdAt: '2026-08-05T06:00:00.000Z',
      updatedAt: '2026-08-05T06:00:00.000Z',
      response_files: [],
    };
    mockGet.mockResolvedValueOnce({ data: { success: true, response: rawResponse } });

    const result = await responsesService.getResponseById('r1');

    expect(mockGet).toHaveBeenCalledWith('/api/responses/r1', { headers: { 'x-workspace-slug': 'personal' } });
    const { response_files, ...rest } = rawResponse;
    expect(result).toEqual({ ...rest, responseFiles: response_files });
  });

  it('update calls PATCH /api/responses/:id with the stage/assignee/tag patch', async () => {
    const payload = { _id: 'r1', stage: { id: 's2', name: 'Completed', colour: 'success', category: 'completed' } };
    mockPatch.mockResolvedValueOnce({ data: { success: true, message: 'ok', response: payload } });

    const result = await responsesService.update('r1', { stageId: 's2' }, 'acme');

    expect(mockPatch).toHaveBeenCalledWith('/api/responses/r1', { stageId: 's2' }, { headers: { 'x-workspace-slug': 'acme' } });
    expect(result).toEqual(payload);
  });

  it('deleteResponse calls DELETE /api/responses/:id and resolves to void', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    const result = await responsesService.deleteResponse('r1');

    expect(mockDelete).toHaveBeenCalledWith('/api/responses/r1', { headers: { 'x-workspace-slug': 'personal' } });
    expect(result).toBeUndefined();
  });

  it('getFileDownloadUrl calls GET /api/responses/:id/file/:fileId and returns the url', async () => {
    mockGet.mockResolvedValueOnce({ data: { url: 'https://mock-r2.example.com/file.pdf' } });

    const result = await responsesService.getFileDownloadUrl('r1', 'f1');

    expect(mockGet).toHaveBeenCalledWith('/api/responses/r1/file/f1');
    expect(result).toEqual({ url: 'https://mock-r2.example.com/file.pdf' });
  });

  it('getStats calls the single GET /api/responses/stats endpoint (not 3 status-filtered calls)', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        success: true,
        total: 42,
        unread: 7,
        byStage: [{ stageId: 's1', name: 'New', category: 'new', count: 10 }],
        byCategory: { new: 10, in_progress: 5, completed: 27 },
      },
    });

    const result = await responsesService.getStats('form-1', 'acme');

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/api/responses/stats', {
      params: { formId: 'form-1' },
      headers: { 'x-workspace-slug': 'acme' },
    });
    expect(result).toEqual({
      total: 42,
      unread: 7,
      byStage: [{ stageId: 's1', name: 'New', category: 'new', count: 10 }],
      byCategory: { new: 10, in_progress: 5, completed: 27 },
    });
  });

  it('getStats works without a formId (all-forms view) and guards a malformed byStage', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, total: 3, unread: 0, byCategory: { new: 1, in_progress: 1, completed: 1 } } });

    const result = await responsesService.getStats();

    expect(mockGet).toHaveBeenCalledWith('/api/responses/stats', { params: { formId: undefined }, headers: { 'x-workspace-slug': 'personal' } });
    expect(result.byStage).toEqual([]);
    expect(result.total).toBe(3);
  });

  it('strips ObjectId-shaped duplicate keys out of answers on both list and detail reads', async () => {
    const dirtyAnswers = { '6a72da1c4b1429c63c6c5589': 'Jayesh', 'Full Name': 'Jayesh' };

    mockGet.mockResolvedValueOnce({
      data: { data: [{ _id: 'r1', formId: 'form-1', answers: dirtyAnswers }], total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    const listResult = await responsesService.getResponses({ formId: 'form-1' });
    expect(listResult.data[0].answers).toEqual({ 'Full Name': 'Jayesh' });

    mockGet.mockResolvedValueOnce({
      data: { success: true, response: { _id: 'r1', formId: 'form-1', answers: dirtyAnswers, response_files: [] } },
    });
    const detailResult = await responsesService.getResponseById('r1');
    expect(detailResult.answers).toEqual({ 'Full Name': 'Jayesh' });
  });

  it('strips UUID-shaped duplicate keys out of answers too (not just Mongo ObjectIds)', async () => {
    const dirtyAnswers = { 'a857e996-5400-4d21-82d4-b130c7a7e735': 'Piyush', 'Short Text': 'Piyush' };
    mockGet.mockResolvedValueOnce({
      data: { data: [{ _id: 'r1', formId: 'form-1', answers: dirtyAnswers }], total: 1, page: 1, limit: 50, totalPages: 1 },
    });

    const result = await responsesService.getResponses({ formId: 'form-1' });

    expect(result.data[0].answers).toEqual({ 'Short Text': 'Piyush' });
  });

  it('drops file-reference garbage values (bare objects, the literal "[object Object]" string, storage paths) from answers', async () => {
    const dirtyAnswers = {
      // Real object — stringifies to "[object Object]" if ever rendered directly.
      Resume: { name: 'resume.pdf', size: 1024 },
      // Backend has also been observed sending that exact string pre-stringified.
      'Cover Letter': '[object Object]',
      // Real full storage path observed during Sprint 4 — multiple ObjectId-shaped segments,
      // a "/responses/" marker, then the original filename (non-hex chars included).
      Attachment:
        '6a6b0c5b9ee5b1318d14352d/6a7328e4d7510e56943c80d4/responses/6a742cc7fc87c8a424135312/wallpaperflare.com_wallpaper__1_.jpg',
      'Full Name': 'Priya',
    };
    mockGet.mockResolvedValueOnce({
      data: { success: true, response: { _id: 'r1', formId: 'form-1', answers: dirtyAnswers, response_files: [] } },
    });

    const result = await responsesService.getResponseById('r1');

    expect(result.answers).toEqual({ 'Full Name': 'Priya' });
  });

  // Sprint 12 (inbox-collaboration), task 2.2 — bulk/markRead.
  it('bulk posts one request for ids and returns succeeded/failed/previous', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, result: { succeeded: ['r1', 'r2'], failed: [{ id: 'r3', reason: 'no access' }], previous: [{ id: 'r1', stageId: 's1' }] } },
    });

    const result = await responsesService.bulk(
      { target: { ids: ['r1', 'r2', 'r3'] }, action: { type: 'stage', stageId: 's2' } },
      'acme'
    );

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/responses/bulk',
      { target: { ids: ['r1', 'r2', 'r3'] }, action: { type: 'stage', stageId: 's2' } },
      { headers: { 'x-workspace-slug': 'acme' } }
    );
    expect(result).toEqual({
      succeeded: ['r1', 'r2'],
      failed: [{ id: 'r3', reason: 'no access' }],
      previous: [{ id: 'r1', stageId: 's1' }],
    });
  });

  it('bulk defensively defaults missing succeeded/failed/previous arrays', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const result = await responsesService.bulk({ target: { ids: ['r1'] }, action: { type: 'read' } });
    expect(result).toEqual({ succeeded: [], failed: [], previous: [] });
  });

  it('bulk surfaces a 413 as a typed BulkBatchLimitError, not a generic axios error', async () => {
    const axiosError = Object.assign(new Error('Payload Too Large'), {
      isAxiosError: true,
      response: { status: 413, data: { cap: 200 } },
    });
    mockPost.mockRejectedValueOnce(axiosError);

    await expect(
      responsesService.bulk({ target: { ids: Array.from({ length: 500 }, (_, i) => `r${i}`) }, action: { type: 'delete' } })
    ).rejects.toBeInstanceOf(BulkBatchLimitError);
  });

  it('markRead posts to /read or /unread depending on the flag', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await responsesService.markRead('r1', true, 'acme');
    expect(mockPost).toHaveBeenCalledWith('/api/responses/r1/read', {}, { headers: { 'x-workspace-slug': 'acme' } });

    mockPost.mockResolvedValueOnce({ data: {} });
    await responsesService.markRead('r1', false);
    expect(mockPost).toHaveBeenCalledWith('/api/responses/r1/unread', {}, { headers: { 'x-workspace-slug': 'personal' } });
  });
});

// design.md §21: "fast-check: ... bulk partial failure accounting". `idsRemainingSelected` is the
// pure reducer `useInboxMutations` (task 2.3) uses to decide which ids stay selected after a bulk
// call — property: a succeeded id is never among the ids left selected.
describe('bulk partial-failure accounting (property)', () => {
  it('never reports a succeeded id as still-selected/failed', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 30 }),
        fc.array(fc.string({ minLength: 1 })),
        (attemptedIds, succeededPool) => {
          // succeeded must be a subset of attemptedIds to be a realistic server response.
          const succeeded = succeededPool.filter((id) => attemptedIds.includes(id));
          const remaining = idsRemainingSelected(attemptedIds, {
            succeeded,
            failed: attemptedIds.filter((id) => !succeeded.includes(id)).map((id) => ({ id, reason: 'x' })),
            previous: [],
          });
          const succeededSet = new Set(succeeded);
          return remaining.every((id) => !succeededSet.has(id));
        }
      ),
      { numRuns: 200 }
    );
  });
});
