import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchAllResponses } from '@/lib/fetchAllResponses';

const mockGetResponses = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getResponses: (...args: unknown[]) => mockGetResponses(...args) },
}));

describe('fetchAllResponses', () => {
  beforeEach(() => {
    mockGetResponses.mockReset();
  });

  it('stops after the first page when everything fits', async () => {
    mockGetResponses.mockResolvedValue({ data: [{ _id: 'r1' }], total: 1, page: 1, limit: 50, totalPages: 1 });
    const result = await fetchAllResponses({}, 'acme');
    expect(result).toHaveLength(1);
    expect(mockGetResponses).toHaveBeenCalledTimes(1);
  });

  it('pages through until totalPages is exhausted, never truncating silently', async () => {
    mockGetResponses
      .mockResolvedValueOnce({ data: [{ _id: 'r1' }], total: 3, page: 1, limit: 50, totalPages: 3 })
      .mockResolvedValueOnce({ data: [{ _id: 'r2' }], total: 3, page: 2, limit: 50, totalPages: 3 })
      .mockResolvedValueOnce({ data: [{ _id: 'r3' }], total: 3, page: 3, limit: 50, totalPages: 3 });

    const result = await fetchAllResponses({}, 'acme');
    expect(result.map((r: { _id: string }) => r._id)).toEqual(['r1', 'r2', 'r3']);
    expect(mockGetResponses).toHaveBeenCalledTimes(3);
  });
});
