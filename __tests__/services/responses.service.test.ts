/**
 * __tests__/services/responses.service.test.ts
 * Feature: sprint-4-responses
 * Tests: responsesService — getResponses, getResponseById, updateStatus, deleteResponse, getFileDownloadUrl
 * Requirements: 9.1-9.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/axios', () => {
  const mockGet = vi.fn();
  const mockPatch = vi.fn();
  const mockDelete = vi.fn();
  return {
    default: {
      get: mockGet,
      patch: mockPatch,
      delete: mockDelete,
      interceptors: { response: { use: vi.fn() } },
    },
  };
});

import axiosInstance from '@/lib/axios';
import { responsesService } from '@/services/responses';

const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;
const mockPatch = axiosInstance.patch as ReturnType<typeof vi.fn>;
const mockDelete = axiosInstance.delete as ReturnType<typeof vi.fn>;

describe('responsesService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
    mockDelete.mockReset();
  });

  it('getResponses calls GET /api/responses with params and returns paginated data', async () => {
    const payload = { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    mockGet.mockResolvedValueOnce({ data: payload });

    const result = await responsesService.getResponses({ formId: 'form-1', status: 'new', page: 1 });

    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: 'form-1', status: 'new', page: 1 } });
    expect(result).toEqual(payload);
  });

  it('getResponseById calls GET /api/responses/:id and unwraps the {success, response} envelope', async () => {
    // Real backend wraps the detail payload and uses snake_case `response_files` — see
    // docs/backend-contract/api-reference.md §3.
    const rawResponse = {
      _id: 'r1',
      formId: 'form-1',
      answers: { Email: 'a@b.com' },
      status: 'new',
      ipHash: 'a1b2c3d4e5f60718',
      submittedAt: '2026-08-05T06:00:00.000Z',
      createdAt: '2026-08-05T06:00:00.000Z',
      updatedAt: '2026-08-05T06:00:00.000Z',
      response_files: [],
    };
    mockGet.mockResolvedValueOnce({ data: { success: true, response: rawResponse } });

    const result = await responsesService.getResponseById('r1');

    expect(mockGet).toHaveBeenCalledWith('/api/responses/r1');
    const { response_files, ...rest } = rawResponse;
    expect(result).toEqual({ ...rest, responseFiles: response_files });
  });

  it('updateStatus calls PATCH /api/responses/:id and unwraps the {success, message, response} envelope', async () => {
    const payload = { _id: 'r1', status: 'completed', updatedAt: '2026-08-05T06:10:00.000Z' };
    mockPatch.mockResolvedValueOnce({ data: { success: true, message: 'Response status updated successfully', response: payload } });

    const result = await responsesService.updateStatus('r1', 'completed');

    expect(mockPatch).toHaveBeenCalledWith('/api/responses/r1', { status: 'completed' });
    expect(result).toEqual(payload);
  });

  it('deleteResponse calls DELETE /api/responses/:id and resolves to void', async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    const result = await responsesService.deleteResponse('r1');

    expect(mockDelete).toHaveBeenCalledWith('/api/responses/r1');
    expect(result).toBeUndefined();
  });

  it('getFileDownloadUrl calls GET /api/responses/:id/file/:fileId and returns the url', async () => {
    mockGet.mockResolvedValueOnce({ data: { url: 'https://mock-r2.example.com/file.pdf' } });

    const result = await responsesService.getFileDownloadUrl('r1', 'f1');

    expect(mockGet).toHaveBeenCalledWith('/api/responses/r1/file/f1');
    expect(result).toEqual({ url: 'https://mock-r2.example.com/file.pdf' });
  });

  it('getStats computes counts client-side from 3 status-filtered list calls (no dedicated backend endpoint yet)', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { data: [], total: 10, page: 1, limit: 1, totalPages: 10 } }) // new
      .mockResolvedValueOnce({ data: { data: [], total: 5, page: 1, limit: 1, totalPages: 5 } }) // in_progress
      .mockResolvedValueOnce({ data: { data: [], total: 27, page: 1, limit: 1, totalPages: 27 } }); // completed

    const result = await responsesService.getStats('form-1');

    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: 'form-1', status: 'new', limit: 1 } });
    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: 'form-1', status: 'in_progress', limit: 1 } });
    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: 'form-1', status: 'completed', limit: 1 } });
    expect(result).toEqual({ total: 42, new: 10, in_progress: 5, completed: 27 });
  });

  it('getStats works without a formId (all-forms view)', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { data: [], total: 1, page: 1, limit: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ data: { data: [], total: 1, page: 1, limit: 1, totalPages: 1 } })
      .mockResolvedValueOnce({ data: { data: [], total: 1, page: 1, limit: 1, totalPages: 1 } });

    const result = await responsesService.getStats();

    expect(mockGet).toHaveBeenCalledWith('/api/responses', { params: { formId: undefined, status: 'new', limit: 1 } });
    expect(result).toEqual({ total: 3, new: 1, in_progress: 1, completed: 1 });
  });

  it('strips ObjectId-shaped duplicate keys out of answers on both list and detail reads', async () => {
    const dirtyAnswers = { '6a72da1c4b1429c63c6c5589': 'Jayesh', 'Full Name': 'Jayesh' };

    mockGet.mockResolvedValueOnce({
      data: { data: [{ _id: 'r1', formId: 'form-1', answers: dirtyAnswers, status: 'new' }], total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    const listResult = await responsesService.getResponses({ formId: 'form-1' });
    expect(listResult.data[0].answers).toEqual({ 'Full Name': 'Jayesh' });

    mockGet.mockResolvedValueOnce({
      data: { success: true, response: { _id: 'r1', formId: 'form-1', answers: dirtyAnswers, status: 'new', response_files: [] } },
    });
    const detailResult = await responsesService.getResponseById('r1');
    expect(detailResult.answers).toEqual({ 'Full Name': 'Jayesh' });
  });

  it('strips UUID-shaped duplicate keys out of answers too (not just Mongo ObjectIds)', async () => {
    const dirtyAnswers = { 'a857e996-5400-4d21-82d4-b130c7a7e735': 'Piyush', 'Short Text': 'Piyush' };
    mockGet.mockResolvedValueOnce({
      data: { data: [{ _id: 'r1', formId: 'form-1', answers: dirtyAnswers, status: 'new' }], total: 1, page: 1, limit: 50, totalPages: 1 },
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
      data: { success: true, response: { _id: 'r1', formId: 'form-1', answers: dirtyAnswers, status: 'new', response_files: [] } },
    });

    const result = await responsesService.getResponseById('r1');

    expect(result.answers).toEqual({ 'Full Name': 'Priya' });
  });
});
